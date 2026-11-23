"""Park Studio 本地 SQLite 单一真相源（~/.park-studio/studio.db）。"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import config


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def db_path() -> Path:
    return config.data_dir() / "studio.db"


def connect(path: Path | None = None) -> sqlite3.Connection:
    target = Path(path) if path else db_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT '写',
    score INTEGER NOT NULL DEFAULT 13,
    source_ref TEXT DEFAULT '',
    body TEXT DEFAULT '',
    hooks_json TEXT DEFAULT '[]',
    picked_hook INTEGER DEFAULT 0,
    audit_json TEXT DEFAULT '{}',
    final_at TEXT DEFAULT NULL,
    trash INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cut_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER,
    episode INTEGER NOT NULL DEFAULT 42,
    title TEXT NOT NULL,
    source_file TEXT DEFAULT '',
    duration TEXT DEFAULT '',
    density TEXT NOT NULL DEFAULT '中',
    burn_subs INTEGER NOT NULL DEFAULT 1,
    hook_idx_json TEXT NOT NULL DEFAULT '[]',
    lines_json TEXT NOT NULL DEFAULT '[]',
    shots_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'cutting',
    worktable_path TEXT DEFAULT '',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS said (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL DEFAULT '实战记录',
    text TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '手动录入',
    muted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tree_branches (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trunk TEXT NOT NULL,
    questions_json TEXT NOT NULL DEFAULT '[]',
    standards_json TEXT NOT NULL DEFAULT '[]',
    pitfalls_json TEXT NOT NULL DEFAULT '[]',
    sources_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    niche TEXT DEFAULT '知识IP',
    stage TEXT NOT NULL DEFAULT '新线索',
    amount INTEGER NOT NULL DEFAULT 0,
    source TEXT DEFAULT '',
    next_step TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daemon_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    episode TEXT DEFAULT '',
    platform TEXT DEFAULT '',
    action TEXT NOT NULL,
    result TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_status (
    platform TEXT PRIMARY KEY,
    state TEXT NOT NULL DEFAULT 'warn',
    detail TEXT NOT NULL DEFAULT '',
    disabled INTEGER NOT NULL DEFAULT 0,
    checked_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS followers_daily (
    day TEXT NOT NULL,
    platform TEXT NOT NULL,
    total INTEGER NOT NULL,
    gain INTEGER,
    loss INTEGER,
    source TEXT NOT NULL DEFAULT 'live',
    collected_at TEXT NOT NULL,
    PRIMARY KEY (day, platform)
);

CREATE TABLE IF NOT EXISTS kv (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
);
"""


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    _seed_if_empty(conn)
    conn.commit()


def _seed_if_empty(conn: sqlite3.Connection) -> None:
    ts = now_iso()
    if conn.execute("SELECT COUNT(*) FROM topics").fetchone()[0] == 0:
        seed_body = (
            "很多人问我，Park，你同时维护线上选题工作台，又搞本地 Content Studio，自己到底天天用哪一套？\n\n"
            "说实话，以前我也割裂。前半段找选题、拆爆款、写口播稿、三路审稿，我最习惯用 Topic Studio；"
            "但一到定稿之后，发七个平台、贴链接、看全网涨粉，这一段以前是断的——我们线上自己验证过，写完稿愿意手动把链接贴回来复盘的人，几乎为零。\n\n"
            "所以我把以前 4 个本地仓库全部收拢，做成唯一一个完全开源的本地内容中控——Park Studio。\n\n"
            "最关键的是两件事：第一，本地版不需要你买一堆 API Key，直接接你电脑上的 Gemini CLI / Claude Code / Codex 就能跑；"
            "第二，国内抖音、小红书、B站、视频号只自动填好、截图存档，最后一下由你自己点发，发完守护进程自动取回链接，直接点亮你的运营大屏。"
        )
        hooks = [
            "我们线上验证过，写完稿愿意手动贴链接复盘的人几乎为零——所以我把发布和大屏做成开源本地中控了。",
            "别再同时维护 4 套工具和买一堆 API Key 了：我开源了 Park Studio，接你本机 Gemini / Claude / Codex 就能跑完 7 平台。",
            "一期视频发 7 个平台差点崩溃？看我如何用 4 个极简工作台（选题/剪辑/发布/复盘）彻底闭环。",
            "我把我自己每天在用的管理员工作台全功能 MIT 开源了，零阉割、零 API 费。",
        ]
        audit = {
            "value": "核心价值清晰：直击前半段 AI 写稿与后半段多平台发布复盘断裂的真痛点，给出全功能开源 + 零 API 费方案。",
            "resonance": "「写完稿手动贴回链接几乎为零」是最强共鸣点，建议往前提到第 20 秒并配界面特写。",
            "rhythm": "第 3 段信息密度略高，把「零 API 费」和「国内只填不点发」拆成两段，留出镜头切换呼吸。",
            "revised": [
                {"tag": "留", "text": "很多人问我，Park，你同时维护线上选题工作台，又搞本地 Content Studio，自己到底天天用哪一套？"},
                {"tag": "改", "text": "说实话，以前我也割裂：前半段找题写稿都在 Topic Studio，可一到发 7 平台复盘就断了——我们实测过，愿意手动贴回链接的人几乎为零。"},
                {"tag": "新", "text": "所以今天，我把之前 4 个本地仓库彻底合并，做成唯一一个 MIT 全开源本地中控：Park Studio。"},
                {"tag": "待填", "text": "【这里补一句你实测的数字：一期视频自动填 7 个平台总共省了多少分钟？】"},
                {"tag": "改", "text": "它解决两件最硬的事：一是不强制买 API Key，接你本机 Gemini / Claude / Codex 就能跑；二是国内四家只填不点发，发完守护进程自动取链接点亮大屏。"},
            ],
        }
        conn.execute(
            "INSERT INTO topics(title, stage, score, source_ref, body, hooks_json, picked_hook, audit_json, final_at, trash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            ("我把 4 个内容工作台合并成 1 个开源本地中控：零 API 费跑通选题剪辑发布复盘", "写", 15, "Obsidian", seed_body,
             json.dumps(hooks, ensure_ascii=False), 0, json.dumps(audit, ensure_ascii=False), None, 0, ts, ts),
        )
        conn.execute(
            "INSERT INTO topics(title, stage, score, source_ref, body, hooks_json, picked_hook, audit_json, final_at, trash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            ("一期视频发 7 个平台太折磨？本地专用 Chrome 彻底闭环", "盘", 14, "对标爆款", seed_body, "[]", 0, "{}", ts, 0, ts, ts),
        )

    if conn.execute("SELECT COUNT(*) FROM cut_projects").fetchone()[0] == 0:
        lines = [
            {"i": 0, "ts": "00:00", "text": "很多人问我，Park，你同时维护线上选题工作台，又搞本地 Content Studio，自己到底天天用哪一套？", "shot": 1},
            {"i": 1, "ts": "00:14", "text": "我们线上自己验证过，写完稿愿意手动把链接贴回来复盘的人，几乎为零。", "shot": 2},
            {"i": 2, "ts": "00:26", "text": "所以我把以前 4 个本地仓库全部收拢，做成唯一一个完全开源的本地内容中控——Park Studio。", "shot": 3},
            {"i": 3, "ts": "00:44", "text": "它分为四个极其干净的工作台：选题、剪辑、发布、复盘。", "shot": 4},
            {"i": 4, "ts": "00:58", "text": "本地版零 API 费，直接接你电脑上的 Gemini CLI / Claude Code / Codex 就能跑；国内四家只填不点发。", "shot": 5},
            {"i": 5, "ts": "01:22", "text": "发完之后，守护进程自动取回链接，每天采集 7 平台粉丝和 1/3/7 天同龄复盘，直接点亮你的运营大屏。", "shot": 6},
        ]
        shots = [
            {"id": 1, "ts": "00:00–00:14", "style": "画中画 · 居中大字弹出", "preview": "「线上 vs 本地，到底用哪套？」", "reason": "前 14 秒抓注意力，双词对比交代冲突。"},
            {"id": 2, "ts": "00:14–00:26", "style": "数据高亮卡（焦橙冲击）", "preview": "贴回链接率 ≈ 0%", "reason": "核心反差事实，放大数字配停顿。"},
            {"id": 3, "ts": "00:26–00:44", "style": "录屏放大 · 4 仓合一动效", "preview": "4 个旧仓 → Park Studio (MIT)", "reason": "展示架构收敛，建立开源可信度。"},
            {"id": 4, "ts": "00:44–00:58", "style": "四格导航高亮追踪", "preview": "[ 选题 | 剪辑 | 发布 | 复盘 ]", "reason": "聚焦左栏四工作台切换。"},
            {"id": 5, "ts": "00:58–01:22", "style": "分屏实录 · 专用 Chrome 自动填表", "preview": "国内只填不点发 · 零 API 费", "reason": "打消对费用和风控的顾虑。"},
            {"id": 6, "ts": "01:22–01:45", "style": "运营大屏推镜 + 涨粉曲线", "preview": "142,359 粉丝 · 同龄 1.7×", "reason": "结尾视觉高潮，强化获得感。"},
        ]
        conn.execute(
            "INSERT INTO cut_projects(topic_id, episode, title, source_file, duration, density, burn_subs, hook_idx_json, lines_json, shots_json, status, updated_at) VALUES (1,42,?,?,?,?,1,?,?,?,'cutting',?)",
            ("我把 4 个内容工作台合并成 1 个开源本地中控", "EP42-原始口播.mov", "7 分 18 秒", "中",
             json.dumps([1, 4]), json.dumps(lines, ensure_ascii=False), json.dumps(shots, ensure_ascii=False), ts),
        )

    if conn.execute("SELECT COUNT(*) FROM said").fetchone()[0] == 0:
        for topic, text, src in [
            ("产品原则", "我们线上自己验证过，写完稿愿意手动把链接贴回来复盘的人，几乎为零。", "EP41 复盘语音 · 02:14"),
            ("风控边界", "国内四家平台绝不做全自动静默发布，只把视频、封面、文案、话题全部填好，最后一下人点。", "Obsidian · 多平台风控边界"),
            ("AI 工作流", "不要让 AI 替你编案例，编出来的东西观众三秒就能听出塑料味。", "EP39 口播 · 04:08"),
            ("开源理念", "所有我自己每天用的功能全部放进 Park Studio 开源版，不搞半残阉割版。", "今日录音 · 00:45"),
        ]:
            conn.execute("INSERT INTO said(topic, text, source, muted, created_at) VALUES (?,?,?,0,?)", (topic, text, src, ts))

    if conn.execute("SELECT COUNT(*) FROM tree_branches").fetchone()[0] == 0:
        branches = [
            ("content-ops", "多平台内容运营与发布闭环",
             "内容生产是“选题→剪辑→发布→复盘”的单一流水线，任何一环靠手工记忆都会掉链子。",
             ["这条内容的单一核心痛点是什么？", "发完 1/3/7 天拿什么指标判断赢了还是输了？"],
             ["国内四家坚持“填完不代发”，零封号红线", "每期发布前强制过 faststart 与封面比例校验", "复盘只看同龄对比（第 N 天对第 N 天）"],
             ["在多平台重复上传同一文件触发风控", "只看总粉丝数，不看日净增和发布日放大倍数"],
             ["mdldm-maitian 实战总结", "Topic Studio 线上观察（贴链接 ≈ 0）"]),
            ("script-writing", "知识型口播写作与三路审稿",
             "好口播不是 AI 堆辞藻，而是用你的真实经历和数字，装进经过验证的节奏骨架里。",
             ["前 5 秒有没有给观众停下来的理由？", "整篇稿子里有几个不可替代的真实数字？"],
             ["原话占比 > 75%，绝不编造经历", "单段口播不超过 80 字，每 20 秒一个小钩子"],
             ["开头先自我介绍 15 秒", "堆砌抽象方法论却没有具体画面"],
             ["park-writing 清单", "dbskill · dbs-script-flow"]),
        ]
        for slug, name, trunk, qs, st, pf, sr in branches:
            conn.execute(
                "INSERT INTO tree_branches VALUES (?,?,?,?,?,?,?,?)",
                (slug, name, trunk, json.dumps(qs, ensure_ascii=False), json.dumps(st, ensure_ascii=False),
                 json.dumps(pf, ensure_ascii=False), json.dumps(sr, ensure_ascii=False), ts),
            )

    if conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0] == 0:
        for name, niche, stage, amt, src, nxt, note in [
            ("周洋帆", "情感 / 知识IP", "已成交", 2000, "抖音 EP39", "本周五定位复盘会", "已跑通对标爆款流"),
            ("林晨", "AI 独立开发", "已约时间", 2000, "X EP41", "明天 15:00 腾讯会议", "关注知识树内化与转化归因"),
            ("陈思远", "财经科普", "新线索", 0, "B站 EP40", "待发定位诊断表", "想把 Obsidian 笔记库接进 Park Studio"),
        ]:
            conn.execute("INSERT INTO clients(name, niche, stage, amount, source, next_step, note, created_at) VALUES (?,?,?,?,?,?,?,?)",
                         (name, niche, stage, amt, src, nxt, note, ts))

    if conn.execute("SELECT COUNT(*) FROM kv WHERE k='positioning'").fetchone()[0] == 0:
        pos = {
            "who": "Park · AI 实战派创作者与开源工具作者（Topic Studio & Park Studio 发起人）",
            "money": "开源免费工具（Park Studio）建立信任 → 线上 SaaS + 1v1 定位咨询 + 知识站会员",
            "diff": "不讲空泛提示词，只晒每天真实在跑的生产线、真实数据大屏与可一键部署的开源代码",
            "rules": "不编造案例、不碰客户平台密码、国内四家坚持人点最后一下、所有数据可追溯",
            "bio": "把一个人的内容团队做成开源软件：选题、剪辑、7 平台填表发布与运营复盘合一。",
        }
        conn.execute("INSERT INTO kv(k, v) VALUES ('positioning', ?)", (json.dumps(pos, ensure_ascii=False),))

    if conn.execute("SELECT COUNT(*) FROM platform_status").fetchone()[0] == 0:
        defaults = [
            ("douyin", "warn", "尚未体检，点击「全部检查」验证专用 Chrome 登录态"),
            ("xhs", "warn", "尚未体检，点击「全部检查」验证专用 Chrome 登录态"),
            ("bilibili", "warn", "尚未体检，点击「全部检查」验证专用 Chrome 登录态"),
            ("channels", "warn", "尚未体检，视频号需定期扫码保活"),
            ("youtube", "warn", "尚未体检，点击「全部检查」验证 YouTube Studio 登录态"),
            ("x", "warn", "尚未体检，点击「全部检查」验证 X 登录态"),
            ("wechat", "warn", "尚未体检，公众号每次发布需扫码确认"),
        ]
        for pid, st, det in defaults:
            conn.execute(
                "INSERT INTO platform_status(platform, state, detail, disabled, checked_at, updated_at) VALUES (?,?,?,0,'未检查',?)",
                (pid, st, det, ts),
            )

    if conn.execute("SELECT COUNT(*) FROM daemon_logs").fetchone()[0] == 0:
        conn.execute("INSERT INTO daemon_logs(ts, episode, platform, action, result) VALUES (?,?,?,?,?)",
                     ("刚刚", "系统", "本地底座", "初始化完成", "SQLite + Obsidian 只读扫描已就绪"))


def log_event(conn: sqlite3.Connection, episode: str, platform: str, action: str, result: str) -> None:
    ts = datetime.now().strftime("%H:%M")
    conn.execute("INSERT INTO daemon_logs(ts, episode, platform, action, result) VALUES (?,?,?,?,?)",
                 (ts, episode, platform, action, result))
    conn.commit()
