"""视频剪辑的纯算法：转写 → 句子 → 停顿 / 重来 / 语气词 → 剪辑表 → 滤镜图和字幕。不碰文件、不碰 ffmpeg，所以能直接测。

流程和规矩来自 Park 的 14 步口播流程（ask-park-video）：
- 转写文字是主材料，钩子必须是整句原话（只按句子编号选，不改写、不拼接）；
- 钩子先播一遍，它的原话在正文里照常保留（钩子只是预告，不从正文删）；
- 响度按 park-voice-v1：-16 LUFS / LRA 7 / 真峰值 -1.5 dBTP，两遍；
- 字幕按 park-caption-4x3-v1 的样子：窄深色底、随文字宽度、底部居中、最多两行、跟着说话的节奏。

时间都是秒。一个 Sentence 长这样：{"id", "start", "end", "text", "words": [{"start","end","text","punct"}]}；
没有逐词时间时 words 是空的，停顿和语气词只能在句子这一层判断。
"""
from __future__ import annotations

import bisect
import difflib
import json
import re
from dataclasses import dataclass, field

# ---------- 可调的规矩（页面上的「停顿超过几秒」只改 pause_s） ----------
PAUSE_S = 0.8            # 句子之间、句子里面的停顿超过这么久就缩短
PAUSE_CHOICES = (0.5, 0.8, 1.2)
PAUSE_MIN_REPORT = 0.4   # 比这短的停顿不记（页面最短的选项是 0.5）
HEAD_PAD = 0.10          # 切口比第一个字早多少
TAIL_PAD = 0.15          # 切口比最后一个字晚多少；两头相加 = 缩短后的停顿 0.25 秒，不是 0
FADE_S = 0.03            # 每个切口声音淡出淡入各 30 毫秒，免得咔一声
MAX_HOOKS = 3
MAX_HOOK_TOTAL_S = 25.0
LOUDNESS = {"I": -16.0, "LRA": 7.0, "TP": -1.5}  # park-voice-v1

FILLER_WORDS = {"嗯", "呃", "额", "唔", "um", "uh", "uhm", "erm", "umm", "hmm", "mm"}
FILLER_SENTENCE = FILLER_WORDS | {"啊", "哦", "唉", "哎", "呀", "er", "ah", "oh"}
LONG_AH = 0.3            # 「啊」拖这么长才当语气词剪，短的多半是真感叹
MISTAKE_MARKERS = ("重来", "重新来", "再来一遍", "再来一次", "说错了", "口误", "刚才不算", "重说", "我再说一遍", "不好意思", "不对不对", "等一下",
                   "sorry", "start again", "start over", "let me redo", "let me try again", "take two", "scratch that", "one more time")
RETAKE_WITHIN_S = 8.0    # 重来都是紧接着的：隔太久的相似句子是前后呼应，不是重录
MISTAKE_MAX_UNITS = 14   # 这么短的句子里出现这些词才当「喊重来」；长句子里出现是正文内容

UNIT = re.compile(r"[a-z0-9']+|[一-鿿]|[^\W_]", re.I)
STRIP_PUNCT = re.compile(r"[，,、；;：:。]+")


def units(text: str) -> list[str]:
    """一句话拆成「字」和「英文词」，拿来比较两句像不像（标点、空格不算）。"""
    return [u.lower() for u in UNIT.findall(text or "")]


# ---------- 转写 → 句子 ----------

def sentences_from_transcript(transcript: dict) -> list[dict]:
    """转写结果（segments，可能带 words）→ 带编号的句子。空句子丢掉，时间保证 end > start。"""
    out: list[dict] = []
    for seg in transcript.get("segments") or []:
        text = str(seg.get("text") or "").strip()
        if not text:
            continue
        start, end = float(seg["start"]), float(seg["end"])
        words = []
        for w in seg.get("words") or []:
            ws, we = float(w["start"]), float(w["end"])
            if we < ws:
                continue
            words.append({"start": ws, "end": max(we, ws + 0.01), "text": str(w.get("text") or ""), "punct": str(w.get("punct") or "")})
        words.sort(key=lambda w: w["start"])
        if words:
            start, end = min(start, words[0]["start"]), max(end, words[-1]["end"])
        out.append({"id": len(out), "start": start, "end": max(end, start + 0.05), "text": text, "words": words})
    return out


# ---------- 找停顿、重来、语气词 ----------

def _is_retake(a: list[str], b: list[str]) -> bool:
    """a 是不是 b 的「废掉的前一遍」：a 是 b 的开头，或者两句几乎一样，或者开头一样、a 没说完就重来了。"""
    if len(a) < 3 or not b:
        return False
    if len(b) > len(a) and b[:len(a)] == a:
        return True
    if min(len(a), len(b)) >= 6 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.75:
        return True
    cp = 0
    for x, y in zip(a, b):
        if x != y:
            break
        cp += 1
    return cp >= 5 and cp >= 0.7 * len(a) and len(a) <= min(len(b), 12)


def analyze(sentences: list[dict]) -> list[dict]:
    """给每一句标：gap_before（和上一句隔多久）、pauses（句子里面 ≥0.4 秒的停顿）、cut（默认要剪掉的理由，没有就是 None）。

    cut 取值：retake 说错重来（后面有更好的一遍，留最后一遍）/ mistake 喊了「重来」「说错了」/ filler 整句只有语气词。
    只是默认勾法，用户随时能改；「该不该剪」最后由人定。
    """
    marks: list[dict] = []
    prev_end = None
    for s in sentences:
        pauses = []
        ws = s["words"]
        for i in range(1, len(ws)):
            gap = ws[i]["start"] - ws[i - 1]["end"]
            if gap >= PAUSE_MIN_REPORT:
                pauses.append({"after": i - 1, "gap": round(gap, 2)})
        marks.append({"id": s["id"], "gap_before": round(max(0.0, s["start"] - prev_end), 2) if prev_end is not None else 0.0, "pauses": pauses, "cut": None})
        prev_end = s["end"]

    toks = [units(s["text"]) for s in sentences]
    for i, s in enumerate(sentences):
        if toks[i] and len(toks[i]) <= 4 and all(t in FILLER_SENTENCE for t in toks[i]):
            marks[i]["cut"] = "filler"
        elif toks[i] and len(toks[i]) <= MISTAKE_MAX_UNITS and any(m in s["text"].lower() for m in MISTAKE_MARKERS):
            marks[i]["cut"] = "mistake"
    for i in range(len(sentences)):
        if marks[i]["cut"]:
            continue
        for j in (i + 1, i + 2):
            if j < len(sentences) and marks[j]["cut"] is None and sentences[j]["start"] - sentences[i]["end"] <= RETAKE_WITHIN_S and _is_retake(toks[i], toks[j]):
                marks[i]["cut"] = "retake"
                break
    return marks


# ---------- 剪辑表：要留哪些段，钩子先放 ----------

@dataclass
class Piece:
    """正文里连续说话的一小段（一个句子，或者被长停顿 / 语气词切开的一半）。"""
    sid: int
    a: float
    b: float
    words: list[dict]
    first: int      # 在全片词序列里的位置，用来找前一个字、后一个字
    last: int
    after: str      # 这一段和上一段之间是怎么断开的：start 开头 / sentence 相邻句子 / pause 长停顿 / filler 剪了语气词 / drop 中间有被剪的句子
    approx: bool = False
    tail_cut: bool = False   # 这一段后面紧跟着被剪掉的语气词，不能和下一句连成一整段


@dataclass
class Span:
    """输出里的一段：从原片 [src_a, src_b] 原样拿出来，放在这一部分的 out_a 开始的位置。"""
    src_a: float
    src_b: float
    out_a: float = 0.0
    pieces: list[Piece] = field(default_factory=list)

    @property
    def dur(self) -> float:
        return self.src_b - self.src_a


@dataclass
class Part:
    kind: str                 # hook 钩子 / body 正文
    spans: list[Span]
    sids: list[int]

    @property
    def dur(self) -> float:
        return sum(sp.dur for sp in self.spans)


class PlanError(ValueError):
    """选择不合规矩（钩子选了被剪掉的句子、超过 3 句……）。信息可以直接给用户看。"""


def _token_index(sentences: list[dict]) -> tuple[list[tuple[float, float]], dict[int, tuple[int, int]]]:
    """全片所有词（没有逐词时间的句子当成一个词）按时间排好，并记下每个句子占哪几个位置。"""
    toks: list[tuple[float, float]] = []
    where: dict[int, tuple[int, int]] = {}
    for s in sentences:
        lo = len(toks)
        if s["words"]:
            toks += [(w["start"], w["end"]) for w in s["words"]]
        else:
            toks.append((s["start"], s["end"]))
        where[s["id"]] = (lo, len(toks) - 1)
    return toks, where


def _pieces(s: dict, lo: int, pause_s: float, *, after_first: str, drop_fillers: bool) -> list[Piece]:
    """一句话切成几小段：长停顿处切开，剪掉的语气词处切开。"""
    ws = s["words"]
    if not ws:
        return [Piece(s["id"], s["start"], s["end"], [], lo, lo, after_first, approx=True)]
    out: list[Piece] = []
    cur: list[int] = []
    reason = after_first

    def flush():
        if cur:
            out.append(Piece(s["id"], ws[cur[0]]["start"], ws[cur[-1]]["end"], [ws[k] for k in cur], lo + cur[0], lo + cur[-1], reason))
            cur.clear()

    prev = None
    for k, w in enumerate(ws):
        if drop_fillers and _inline_filler(w):
            flush()
            reason = "filler"
            prev = None
            if out:
                out[-1].tail_cut = True
            continue
        if prev is not None and w["start"] - ws[prev]["end"] > pause_s:
            flush()
            reason = "pause"
        cur.append(k)
        prev = k
    flush()
    if out and ws and drop_fillers and _inline_filler(ws[-1]):
        out[-1].tail_cut = True
    return out


def _inline_filler(w: dict) -> bool:
    t = w["text"].strip().lower()
    if t in FILLER_WORDS:
        return True
    return t == "啊" and not w.get("punct") and w["end"] - w["start"] >= LONG_AH


def _span_edges(p: Piece, toks: list[tuple[float, float]], total: float) -> tuple[float, float]:
    """这一段的切口：比第一个字早一点、比最后一个字晚一点，但不进别人的话里（和邻居的字隔得近就取中点）。"""
    prev_end = toks[p.first - 1][1] if p.first > 0 else 0.0
    next_start = toks[p.last + 1][0] if p.last + 1 < len(toks) else total
    a = p.a - HEAD_PAD
    if prev_end > a:
        a = (prev_end + p.a) / 2 if prev_end < p.a else p.a
    b = p.b + TAIL_PAD
    if next_start < b:
        b = (p.b + next_start) / 2 if next_start > p.b else p.b
    return max(0.0, a), min(total, max(b, a + 0.05))


def _build_part(kind: str, pieces: list[Piece], toks, total: float, pause_s: float) -> Part:
    spans: list[Span] = []
    for p in pieces:
        a, b = _span_edges(p, toks, total)
        joinable = spans and p.after == "sentence" and not spans[-1].pieces[-1].tail_cut and p.a - spans[-1].pieces[-1].b <= pause_s
        if joinable:
            spans[-1].src_b = max(b, spans[-1].src_b)
            spans[-1].pieces.append(p)
        else:
            spans.append(Span(a, b, pieces=[p]))
    out = 0.0
    for sp in spans:
        sp.out_a = out
        out += sp.dur
    return Part(kind, spans, sorted({p.sid for p in pieces}))


def validate_choices(sentences: list[dict], drop: list[int], hooks: list[int]) -> None:
    ids = {s["id"] for s in sentences}
    if len(set(hooks)) != len(hooks):
        raise PlanError("同一句不能选两次当钩子")
    if len(hooks) > MAX_HOOKS:
        raise PlanError(f"钩子最多选 {MAX_HOOKS} 句")
    for i in hooks:
        if i not in ids:
            raise PlanError("钩子里有一句找不到了，刷新页面再选")
        if i in set(drop):
            raise PlanError("被剪掉的句子不能当钩子")
    if not ids - set(drop):
        raise PlanError("整条都剪掉了，至少留一句")
    if any(i not in ids for i in drop):
        raise PlanError("有一句找不到了，刷新页面再选")
    total = sum(s["end"] - s["start"] for s in sentences if s["id"] in set(hooks))
    if total > MAX_HOOK_TOTAL_S:
        raise PlanError(f"钩子加起来不能超过 {int(MAX_HOOK_TOTAL_S)} 秒，现在 {total:.0f} 秒；少选一句或换短一点的")


def build_parts(sentences: list[dict], drop: list[int], hooks: list[int], *, pause_s: float = PAUSE_S, total: float | None = None, has_words: bool | None = None) -> list[Part]:
    """按用户的选择排出输出：每个钩子一部分（按选的顺序）+ 正文一部分。钩子的话在正文里原位置照常留着。"""
    validate_choices(sentences, drop, hooks)
    toks, where = _token_index(sentences)
    total = total if total is not None else max(sentences[-1]["end"], toks[-1][1])
    dropped = set(drop)
    by_id = {s["id"]: s for s in sentences}
    drop_fillers = any(s["words"] for s in sentences) if has_words is None else has_words
    parts: list[Part] = []
    for h in hooks:
        ps = _pieces(by_id[h], where[h][0], pause_s, after_first="start", drop_fillers=drop_fillers)
        parts.append(_build_part("hook", ps, toks, total, pause_s))
    body: list[Piece] = []
    last_kept = None
    for s in sentences:
        if s["id"] in dropped:
            continue
        adjacent = last_kept is not None and s["id"] == last_kept + 1
        body += _pieces(s, where[s["id"]][0], pause_s, after_first="sentence" if adjacent else ("drop" if last_kept is not None else "start"), drop_fillers=drop_fillers)
        last_kept = s["id"]
    parts.append(_build_part("body", body, toks, total, pause_s))
    return parts


def summarize(parts: list[Part], sentences: list[dict]) -> dict:
    """页面上「原片 X → 剪后约 Y」用的数。"""
    return {"out_duration": round(sum(p.dur for p in parts), 1), "hook_duration": round(sum(p.dur for p in parts if p.kind == "hook"), 1),
            "spans": sum(len(p.spans) for p in parts), "cuts": max(0, sum(len(p.spans) for p in parts if p.kind == "body") - 1)}


# ---------- AI 推荐钩子 ----------

HOOK_PROMPT_ZH = """你是短视频口播的剪辑顾问。下面是一条口播的逐字稿，每句前面有编号。

任务：挑出 1 到 3 句最适合放在视频最开头当「钩子」的原话。你只回编号，不改写、不拼接、不补字。

规矩：
- 只能选整句，句子要完整：有说话的对象，离开上下文也听得懂；不能只剩「这很重要」「就是这样」这类指代。
- 优先选有反差、有具体代价、有观众关心的冲突或结论的句子；语气不能强过正文，不夸大。
- 不要选标了【剪】的句子（那些是要剪掉的废话或说错的）。
- 选 3 句时，彼此不要说同一个意思；顺序尽量是：冲突或问题 → 和别人不一样的判断 → 让人想回头看正文的理由，不用硬凑。
- 句子太长的不要（最好 3 到 12 秒）。
- 没有真正合适的句子，就少选，甚至一句都不选。

只输出 JSON：{"hooks":[{"id":编号,"reason":"一句话说明为什么适合放开头"}]}

逐字稿：
"""
HOOK_PROMPT_EN = """You are an editing advisor for talking-head short videos. Below is a transcript; each line starts with an id.

Task: pick 1 to 3 sentences that work best as the opening hook. Reply with ids only. Never rewrite, merge or add words.

Rules:
- Whole sentences only; each must stand on its own and name its subject. Skip vague lines like "this matters" or "that's it".
- Prefer sentences with contrast, a concrete cost, or a conflict or conclusion the viewer cares about. Never stronger than the body backs up.
- Never pick lines marked [CUT] (those are retakes or filler).
- With 3 picks, do not repeat the same idea. Rough order: conflict or question, then a different take, then a reason to watch on.
- Skip very long sentences (best 3 to 12 seconds).
- If nothing is truly good, pick fewer, or none.

Output JSON only: {"hooks":[{"id":<id>,"reason":"one sentence on why it opens well"}]}

Transcript:
"""


def hook_prompt(sentences: list[dict], marks: list[dict], lang: str = "zh") -> str:
    cut = {m["id"] for m in marks if m["cut"]}
    tag = "[CUT] " if lang == "en" else "【剪】"
    lines = [f"{s['id']}. {tag if s['id'] in cut else ''}{s['text']} ({s['end'] - s['start']:.0f}s)" for s in sentences]
    return (HOOK_PROMPT_EN if lang == "en" else HOOK_PROMPT_ZH) + "\n".join(lines)


def parse_hooks(text: str, sentences: list[dict], marks: list[dict]) -> list[dict]:
    """AI 的回答 → [{"id", "reason"}]。只认存在的、没被默认剪掉的、不太长的句子；AI 说什么文字都不进视频，只取编号。"""
    m = re.search(r"\{.*\}", text or "", re.S)
    try:
        items = (json.loads(m.group(0)) if m else {}).get("hooks") or []
    except ValueError:
        return []
    by_id = {s["id"]: s for s in sentences}
    cut = {x["id"] for x in marks if x["cut"]}
    out, total = [], 0.0
    for it in items:
        try:
            i = int(it["id"])
        except (KeyError, TypeError, ValueError):
            continue
        s = by_id.get(i)
        if s is None or i in cut or any(o["id"] == i for o in out) or len(units(s["text"])) < 4:
            continue
        dur = s["end"] - s["start"]
        if total + dur > MAX_HOOK_TOTAL_S:
            continue
        total += dur
        out.append({"id": i, "reason": str(it.get("reason") or "")[:120]})
        if len(out) == MAX_HOOKS:
            break
    return out


# ---------- 字幕（ASS） ----------

def caption_metrics(w: int, h: int) -> dict:
    """字号、每行最多几个字、离底边多远。竖屏按宽度、横屏按高度定，竖屏的字幕要躲开抖音底部的文案条。"""
    portrait = h > w * 1.2
    font = round(min(0.058 * w, 0.044 * h))
    return {"font": font, "pad": max(6, round(font * 0.26)), "margin_v": round(h * (0.14 if portrait else 0.06)), "max_w": 0.86 * w if portrait else 0.8 * w, "portrait": portrait}


def _width(ch: str) -> float:
    """一个字占几个「字宽」：汉字 1，英文字母约 0.55，空格 0.3。"""
    if ord(ch) >= 0x2E80:
        return 1.0
    return 0.3 if ch == " " else 0.55


def text_width(text: str) -> float:
    return sum(_width(c) for c in text)


TOKEN = re.compile(r"[\u2E80-\uFFFF]|[A-Za-z0-9'’\-]+|\s+|[^\sA-Za-z0-9'’\-\u2E80-\uFFFF]")


def _wrap(text: str, max_units: float) -> list[str]:
    """一行放得下就一行；放不下折成两行，尽量在空格（原来的逗号句号）处折、两行一样长；折两行还不够就按宽度一行行排。"""
    text = text.strip()
    if text_width(text) <= max_units:
        return [text]
    toks = TOKEN.findall(text)
    widths = [text_width(t) for t in toks]
    total = sum(widths)
    best, left = None, 0.0
    for i in range(1, len(toks)):
        left += widths[i - 1]
        right = total - left
        penalty = 0.0 if (toks[i - 1].isspace() or toks[i].isspace()) else 2.0
        score = max(left, right) + penalty
        if max(left, right) <= max_units and (best is None or score < best[0]):
            best = (score, i)
    if best:
        i = best[1]
        return ["".join(toks[:i]).strip(), "".join(toks[i:]).strip()]
    lines, cur = [], ""
    for t in toks:
        if cur and text_width(cur + t) > max_units:
            lines.append(cur.strip())
            cur = ""
        cur += t
    if cur.strip():
        lines.append(cur.strip())
    return lines


WORD_LIKE = re.compile(r"[A-Za-z0-9']+$")
BREAKS = "，,。；;？?！!、：:"


def _tokens(p: Piece, sentence_text: str) -> list[tuple[str, float, float]]:
    """一小段话 → [(字, 开始, 结束)]，字幕靠它定每条什么时候出现。有逐词时间用逐词，没有就把这段时间按字数平均分。"""
    if p.words:
        return [(w["text"] + w["punct"] + (" " if WORD_LIKE.search(w["text"] + w["punct"]) else ""), w["start"], w["end"]) for w in p.words]
    chars = list(sentence_text.strip())
    step = (p.b - p.a) / max(1, len(chars))
    return [(c, p.a + i * step, p.a + (i + 1) * step) for i, c in enumerate(chars)]


def _clean(text: str) -> str:
    """字幕里不留逗号句号（短视频字幕的习惯），原来的停顿换成一个空格；问号叹号留着。"""
    text = STRIP_PUNCT.sub(" ", text)
    return re.sub(r"\s+", " ", re.sub(r"\.+\s*$", "", text.strip())).strip()


def _fit(group: list[tuple[str, float, float]], max_units: float) -> list[list[tuple[str, float, float]]]:
    """一截话如果两行也放不下，按宽度拆成几条。"""
    if len(_wrap(_clean("".join(t[0] for t in group)), max_units)) <= 2:
        return [group]
    out, cur, width = [], [], 0.0
    for t in group:
        tw = text_width(t[0])
        if cur and width + tw > max_units * 2 - 1:
            out.append(cur)
            cur, width = [], 0.0
        cur.append(t)
        width += tw
    if cur:
        out.append(cur)
    return out


def cues_for_part(part: Part, by_id: dict[int, dict], w: int, h: int) -> list[dict]:
    """这一部分的字幕：[{"start","end","lines"}]，时间从这一部分开头算。放不下一行就两行；跟着说话走，不重叠。"""
    max_units = caption_metrics(w, h)["max_w"] / caption_metrics(w, h)["font"]
    cues: list[dict] = []
    for sp in part.spans:
        for p in sp.pieces:
            groups: list[list[tuple[str, float, float]]] = [[]]
            for tok in _tokens(p, by_id[p.sid]["text"]):
                groups[-1].append(tok)
                if tok[0].rstrip()[-1:] in BREAKS and sum(len(t[0]) for t in groups[-1]) >= 3:
                    groups.append([])
            merged: list[list[tuple[str, float, float]]] = []
            for g in (g for g in groups if g):  # 太短的一截并到下一截，免得字幕一闪而过
                if merged and sum(len(t[0]) for t in merged[-1]) < 4:
                    merged[-1] += g
                else:
                    merged.append(g)
            if len(merged) > 1 and sum(len(t[0]) for t in merged[-1]) < 3:
                merged[-2] += merged.pop()
            for g in merged:
                for sub in _fit(g, max_units):
                    text = _clean("".join(t[0] for t in sub))
                    if text:
                        cues.append({"start": sp.out_a + sub[0][1] - sp.src_a, "end": sp.out_a + sub[-1][2] - sp.src_a, "lines": _wrap(text, max_units)})
    for i, c in enumerate(cues):  # 不重叠；至少停 0.5 秒，说完再多留一点点
        nxt = cues[i + 1]["start"] if i + 1 < len(cues) else part.dur
        c["start"] = max(0.0, c["start"])
        c["end"] = min(max(c["end"] + 0.12, c["start"] + 0.5), nxt - 0.02, part.dur)
    return [c for c in cues if c["end"] - c["start"] >= 0.05]


def _ts(t: float) -> str:
    cs = int(round(max(0.0, t) * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _ass_text(s: str) -> str:
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def build_ass(cues: list[dict], w: int, h: int, font: str) -> str:
    """ASS 字幕。样子照 park-caption-4x3-v1：白字、深色底随文字宽度、底部居中。
    libass 画不了圆角方块，所以用「很粗的深色描边」代替底：描边是圆角的，一行或两行都连成一个胶囊。"""
    m = caption_metrics(w, h)
    # 颜色是 &HAABBGGRR（AA 越大越透明）：字 #FFFDF6，底 rgba(9,12,10,.84)
    style = f"Style: Cap,{font},{m['font']},&H00F6FDFF,&H00F6FDFF,&H290A0C09,&H00000000,-1,0,0,0,100,100,0,0,1,{m['pad']},0,2,40,40,{m['margin_v']},1"
    head = (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {w}\nPlayResY: {h}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
            "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            f"ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n{style}\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    newline = "\\N"
    body = "".join(f"Dialogue: 0,{_ts(c['start'])},{_ts(c['end'])},Cap,,0,0,0,,{newline.join(_ass_text(x) for x in c['lines'])}\n" for c in cues)
    return head + body


# ---------- ffmpeg 滤镜图 ----------

def out_size(src_w: int, src_h: int) -> tuple[int, int]:
    """输出尺寸：和原片同样的比例，长边最多 1920、短边最多 1080，宽高取偶数。"""
    k = min(1.0, 1920 / max(src_w, src_h), 1080 / min(src_w, src_h))
    ev = lambda v: max(2, int(round(v * k / 2)) * 2)  # noqa: E731
    return ev(src_w), ev(src_h)


def _esc_path(path: str) -> str:
    return path.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace(",", "\\,").replace("[", "\\[").replace("]", "\\]")


def graph(spans: list[Span], *, w: int, h: int, fps: int, ass_path: str | None, loudnorm: str | None, video: bool = True) -> str:
    """一部分的滤镜图：每段 trim 出来、两头淡入淡出、接起来；视频再缩放、烧字幕；声音最后统一响度。
    输出标签：[v]（video=True 时）和 [a]。同一个源文件按时间顺序用，所以 ffmpeg 不用把没轮到的画面缓存起来。"""
    n = len(spans)
    lines: list[str] = []
    ins = []
    for k, sp in enumerate(spans):
        a, b, d = sp.src_a, sp.src_b, sp.dur
        fade = min(FADE_S, d / 3)
        if video:
            lines.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{k}]")
            ins.append(f"[v{k}]")
        lines.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,afade=t=in:st=0:d={fade:.3f},afade=t=out:st={max(0.0, d - fade):.3f}:d={fade:.3f}[a{k}]")
        ins.append(f"[a{k}]")
    if video:
        lines.append("".join(ins) + f"concat=n={n}:v=1:a=1[cv][ca]")
        vf = f"[cv]fps={fps},scale={w}:{h}:flags=bicubic,setsar=1,format=yuv420p"
        if ass_path:
            vf += f",ass=filename={_esc_path(ass_path)}"
        lines.append(vf + "[v]")
        last = "[ca]"
    else:
        lines.append("".join(ins) + f"concat=n={n}:v=0:a=1[ca]")
        last = "[ca]"
    lines.append(f"{last}{loudnorm + ',' if loudnorm else ''}aresample=48000,aformat=channel_layouts=stereo[a]")
    return ";\n".join(lines)


def loudnorm_filter(measured: dict | None = None) -> str:
    """没量过：只量不改（print_format=json）；量过了：按量出来的数线性调整（每一部分用同一组数，整条片响度才一致）。"""
    base = f"loudnorm=I={LOUDNESS['I']}:LRA={LOUDNESS['LRA']}:TP={LOUDNESS['TP']}"
    if not measured:
        return base + ":print_format=json"
    return (base + f":measured_I={measured['input_i']}:measured_LRA={measured['input_lra']}:measured_TP={measured['input_tp']}"
            f":measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:linear=true")
