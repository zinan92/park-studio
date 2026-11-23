"""Park Studio FastAPI 后端：真实 SQLite 持久化 + Obsidian 只读扫描 + 本地 AI CLI（Gemini/Claude/Codex）+ worktable.json 导出。"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import ai, cdp, config, db, platforms, vault

STATIC_DIR = Path(__file__).resolve().parent / "static"


class TopicCreate(BaseModel):
    title: str
    source_ref: str = "手动添加"
    body: str = ""
    stage: str = "写"


class TopicUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    stage: str | None = None
    picked_hook: int | None = None
    hooks: list[str] | None = None
    audit: dict[str, Any] | None = None
    finalize: bool | None = None
    trash: bool | None = None


class CutUpdate(BaseModel):
    density: str | None = None
    burn_subs: bool | None = None
    hook_idx: list[int] | None = None
    shots: list[dict[str, Any]] | None = None
    status: str | None = None


class SaidCreate(BaseModel):
    topic: str = "实战记录"
    text: str
    source: str = "手动录入"


class ClientCreate(BaseModel):
    name: str
    niche: str = "知识IP"
    source: str = "自然流量"
    note: str = ""


class AIRequest(BaseModel):
    topic_id: int | None = None
    title: str = ""
    body: str = ""
    prompt: str = ""
    url: str = ""
    slug: str = "content-ops"
    density: str = "中"


class PlatformActionReq(BaseModel):
    platforms: list[str] | None = None


class PlatformToggleReq(BaseModel):
    disabled: bool


class FeishuTestReq(BaseModel):
    webhook: str = ""


def _row_topic(r) -> dict[str, Any]:
    return {
        "id": r["id"],
        "title": r["title"],
        "stage": r["stage"],
        "score": r["score"],
        "source_ref": r["source_ref"],
        "body": r["body"],
        "hooks": json.loads(r["hooks_json"] or "[]"),
        "picked_hook": r["picked_hook"],
        "audit": json.loads(r["audit_json"] or "{}"),
        "final_at": r["final_at"],
        "trash": bool(r["trash"]),
        "updated": (r["updated_at"] or "")[:16].replace("T", " "),
    }


def _row_cut(r) -> dict[str, Any]:
    return {
        "id": r["id"],
        "topic_id": r["topic_id"],
        "episode": r["episode"],
        "title": r["title"],
        "sourceFile": r["source_file"],
        "duration": r["duration"],
        "density": r["density"],
        "burnSubs": bool(r["burn_subs"]),
        "hookIdx": json.loads(r["hook_idx_json"] or "[]"),
        "lines": json.loads(r["lines_json"] or "[]"),
        "shots": json.loads(r["shots_json"] or "[]"),
        "status": r["status"],
        "worktablePath": r["worktable_path"],
        "selectedShot": 1,
    }


def create_app(db_file: Path | None = None) -> FastAPI:
    app = FastAPI(title="Park Studio", version="0.1.2")
    conn = db.connect(db_file)
    db.init_db(conn)

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        cfg = config.load_config()
        return {
            "ok": True,
            "version": "0.1.2",
            "data_dir": str(config.data_dir()),
            "vault": vault.vault_status(cfg),
            "agents": ai.detect_agents(),
            "active_ai": {"backend": cfg.get("aiBackend"), "model": cfg.get("aiModel")},
        }

    @app.get("/api/bootstrap")
    def bootstrap() -> dict[str, Any]:
        cfg = config.load_config()
        topics = [_row_topic(r) for r in conn.execute("SELECT * FROM topics ORDER BY id DESC").fetchall()]
        cuts = [_row_cut(r) for r in conn.execute("SELECT * FROM cut_projects ORDER BY id DESC").fetchall()]
        said = [
            {"id": r["id"], "topic": r["topic"], "text": r["text"], "from": r["source"], "muted": bool(r["muted"])}
            for r in conn.execute("SELECT * FROM said ORDER BY id DESC").fetchall()
        ]
        tree = [
            {
                "slug": r["slug"], "name": r["name"], "trunk": r["trunk"],
                "questions": json.loads(r["questions_json"]),
                "standards": json.loads(r["standards_json"]),
                "pitfalls": json.loads(r["pitfalls_json"]),
                "sources": json.loads(r["sources_json"]),
            }
            for r in conn.execute("SELECT * FROM tree_branches ORDER BY slug").fetchall()
        ]
        clients = [
            {"id": r["id"], "name": r["name"], "niche": r["niche"], "stage": r["stage"],
             "amount": r["amount"], "source": r["source"], "next": r["next_step"], "note": r["note"]}
            for r in conn.execute("SELECT * FROM clients ORDER BY id DESC").fetchall()
        ]
        logs = [
            {"ts": r["ts"], "ep": r["episode"], "plat": r["platform"], "action": r["action"], "result": r["result"]}
            for r in conn.execute("SELECT * FROM daemon_logs ORDER BY id DESC LIMIT 30").fetchall()
        ]
        pos_row = conn.execute("SELECT v FROM kv WHERE k='positioning'").fetchone()
        positioning = json.loads(pos_row["v"]) if pos_row else {}
        lm_row = conn.execute("SELECT v FROM kv WHERE k='last_metrics_at'").fetchone()
        last_metrics_at = lm_row["v"] if lm_row else ""
        followers_live = platforms.get_followers_map(conn, days=30)
        return {
            "config": cfg,
            "vaultStatus": vault.vault_status(cfg),
            "chromeStatus": cdp.chrome_status(cfg),
            "platformStatus": platforms.get_platform_status_map(conn),
            "followersLive": followers_live,
            "hasLiveFollowers": bool(followers_live),
            "lastMetricsAt": last_metrics_at,
            "agents": ai.detect_agents(),
            "newsletterIssue": vault.parse_newsletter_issue(None, cfg=cfg),
            "vault": {
                "newsletter": vault.scan_bucket("newsletter", limit=15, cfg=cfg),
                "saved": vault.scan_bucket("saved", limit=25, cfg=cfg),
                "writing": vault.scan_bucket("writing", limit=25, cfg=cfg),
                "kline": vault.scan_bucket("kline", limit=10, cfg=cfg),
            },
            "topics": topics,
            "cutProject": cuts[0] if cuts else None,
            "said": said,
            "tree": tree,
            "clients": clients,
            "daemonLogs": logs,
            "positioning": positioning,
        }

    # ---------- AI 日报按期/按条解析（对齐 xuanti 工作台） ----------
    @app.get("/api/source/newsletter")
    def get_newsletter_issue(day: str | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        issue = vault.parse_newsletter_issue(day, cfg=cfg)
        if issue is None:
            return {"issue": None}
        return {"issue": issue}

    @app.get("/api/source/newsletter/item")
    def get_newsletter_item(id: str, day: str | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        item = vault.read_newsletter_item(day, id, cfg=cfg)
        if item is None:
            raise HTTPException(404, "找不到这一条日报快讯")
        return item

    # ---------- Obsidian 只读 ----------
    @app.get("/api/vault/{bucket}")
    def get_vault_bucket(bucket: str, limit: int = 20) -> dict[str, Any]:
        cfg = config.load_config()
        return {"bucket": bucket, "status": vault.vault_status(cfg), "items": vault.scan_bucket(bucket, limit=limit, cfg=cfg)}

    @app.get("/api/vault-note")
    def get_vault_note(path: str) -> dict[str, Any]:
        note = vault.read_note(path)
        if note is None:
            raise HTTPException(404, "找不到这篇笔记")
        return note

    # ---------- 选题与口播稿 CRUD ----------
    @app.post("/api/topics")
    def create_topic(req: TopicCreate) -> dict[str, Any]:
        title = req.title.strip()
        if not title:
            raise HTTPException(400, "题目不能为空")
        ts = db.now_iso()
        cur = conn.execute(
            "INSERT INTO topics(title, stage, score, source_ref, body, created_at, updated_at) VALUES (?,?,13,?,?,?,?)",
            (title, req.stage, req.source_ref, req.body, ts, ts),
        )
        db.log_event(conn, "选题", req.source_ref, "新增选题", title[:40])
        row = conn.execute("SELECT * FROM topics WHERE id=?", (cur.lastrowid,)).fetchone()
        return _row_topic(row)

    @app.patch("/api/topics/{topic_id}")
    def update_topic(topic_id: int, req: TopicUpdate) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM topics WHERE id=?", (topic_id,)).fetchone()
        if not row:
            raise HTTPException(404, "选题不存在")
        ts = db.now_iso()
        title = req.title if req.title is not None else row["title"]
        body = req.body if req.body is not None else row["body"]
        stage = req.stage if req.stage is not None else row["stage"]
        picked_hook = req.picked_hook if req.picked_hook is not None else row["picked_hook"]
        hooks_json = json.dumps(req.hooks, ensure_ascii=False) if req.hooks is not None else row["hooks_json"]
        audit_json = json.dumps(req.audit, ensure_ascii=False) if req.audit is not None else row["audit_json"]
        final_at = ts if req.finalize else row["final_at"]
        if req.finalize:
            stage = "剪"
        trash = int(req.trash) if req.trash is not None else row["trash"]
        conn.execute(
            "UPDATE topics SET title=?, body=?, stage=?, picked_hook=?, hooks_json=?, audit_json=?, final_at=?, trash=?, updated_at=? WHERE id=?",
            (title, body, stage, picked_hook, hooks_json, audit_json, final_at, trash, ts, topic_id),
        )
        conn.commit()
        if req.finalize:
            db.log_event(conn, f"#{topic_id}", "选题台", "稿子定稿", title[:40])
        return _row_topic(conn.execute("SELECT * FROM topics WHERE id=?", (topic_id,)).fetchone())

    # ---------- 剪辑镜头表 Spec Table + 真实 worktable.json 导出 ----------
    @app.patch("/api/cut/{cut_id}")
    def update_cut(cut_id: int, req: CutUpdate) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        ts = db.now_iso()
        density = req.density if req.density is not None else row["density"]
        burn_subs = int(req.burn_subs) if req.burn_subs is not None else row["burn_subs"]
        hook_idx_json = json.dumps(req.hook_idx) if req.hook_idx is not None else row["hook_idx_json"]
        shots_json = json.dumps(req.shots, ensure_ascii=False) if req.shots is not None else row["shots_json"]
        status = req.status if req.status is not None else row["status"]
        conn.execute(
            "UPDATE cut_projects SET density=?, burn_subs=?, hook_idx_json=?, shots_json=?, status=?, updated_at=? WHERE id=?",
            (density, burn_subs, hook_idx_json, shots_json, status, ts, cut_id),
        )
        conn.commit()
        return _row_cut(conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone())

    @app.post("/api/cut/{cut_id}/export-worktable")
    def export_worktable(cut_id: int) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        cut = _row_cut(row)
        ep_dir = config.projects_dir() / f"EP{cut['episode']}"
        ep_dir.mkdir(parents=True, exist_ok=True)
        out_path = ep_dir / "worktable.json"
        payload = {
            "schema": "park-studio/worktable/v1",
            "episode": cut["episode"],
            "title": cut["title"],
            "source_file": cut["sourceFile"],
            "burn_subtitles": cut["burnSubs"],
            "density": cut["density"],
            "hook_lines": [l for l in cut["lines"] if l["i"] in cut["hookIdx"]],
            "shots": cut["shots"],
            "exported_at": db.now_iso(),
        }
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        conn.execute("UPDATE cut_projects SET worktable_path=?, updated_at=? WHERE id=?", (str(out_path), db.now_iso(), cut_id))
        db.log_event(conn, f"EP{cut['episode']}", "剪辑台", "导出 worktable.json", str(out_path))
        return {"ok": True, "path": str(out_path), "payload": payload}

    # ---------- 本地 Coding Agent AI 动作（默认 Gemini CLI / Neon） ----------
    def _positioning_text() -> str:
        r = conn.execute("SELECT v FROM kv WHERE k='positioning'").fetchone()
        if not r:
            return ""
        pos = json.loads(r["v"])
        return f"创作者定位：{pos.get('who', '')}；差异化：{pos.get('diff', '')}；原则：{pos.get('rules', '')}"

    def _said_text() -> str:
        rows = conn.execute("SELECT topic, text FROM said WHERE muted=0 ORDER BY id DESC LIMIT 12").fetchall()
        return "\n".join(f"- [{r['topic']}] {r['text']}" for r in rows)

    @app.post("/api/ai/hooks")
    def ai_hooks(req: AIRequest) -> dict[str, Any]:
        prompt = (
            f"{_positioning_text()}\n\n"
            f"选题：{req.title}\n现有正文摘要：{req.body[:1200]}\n\n"
            "请生成 4 个适合短视频前 5 秒的强抓人开头钩子（口语自然、直击痛点、不要虚词）。"
            '严格只返回一个 JSON 数组，例如 ["钩子1", "钩子2", "钩子3", "钩子4"]。'
        )
        try:
            res = ai.run_prompt(prompt)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        parsed = ai.extract_json_block(res["text"])
        hooks = [str(x).strip() for x in parsed if str(x).strip()][:5] if isinstance(parsed, list) else [
            ln.lstrip("-•1234567890. ").strip() for ln in res["text"].splitlines() if ln.strip()
        ][:4]
        if req.topic_id and hooks:
            conn.execute("UPDATE topics SET hooks_json=?, updated_at=? WHERE id=?",
                         (json.dumps(hooks, ensure_ascii=False), db.now_iso(), req.topic_id))
            conn.commit()
        db.log_event(conn, "AI", f"{res['backend']}/{res['model']}", "生成开头钩子", f"产出 {len(hooks)} 条")
        return {"hooks": hooks, "backend": res["backend"], "model": res["model"]}

    @app.post("/api/ai/audit")
    def ai_audit(req: AIRequest) -> dict[str, Any]:
        prompt = (
            f"{_positioning_text()}\n\n"
            f"创作者真实原话库（绝不要替他编造案例）：\n{_said_text()}\n\n"
            f"待审口播稿标题：{req.title}\n正文：\n{req.body[:4000]}\n\n"
            "请按「价值 / 共鸣 / 节奏」三路完整诊断，并输出整篇重排对照稿（每段标 tag 为 留 / 改 / 新 / 待填）。\n"
            '严格只返回 JSON 对象：{"value":"...","resonance":"...","rhythm":"...","revised":[{"tag":"留|改|新|待填","text":"..."}]}'
        )
        try:
            res = ai.run_prompt(prompt)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        parsed = ai.extract_json_block(res["text"])
        if not isinstance(parsed, dict) or "revised" not in parsed:
            parsed = {
                "value": res["text"][:260],
                "resonance": "已完成诊断，建议核对开头 5 秒和真实数字密度。",
                "rhythm": "已按口播短句节奏检查。",
                "revised": [{"tag": "改", "text": p} for p in req.body.split("\n\n") if p.strip()],
            }
        if req.topic_id:
            conn.execute("UPDATE topics SET audit_json=?, stage='审', updated_at=? WHERE id=?",
                         (json.dumps(parsed, ensure_ascii=False), db.now_iso(), req.topic_id))
            conn.commit()
        db.log_event(conn, "AI", f"{res['backend']}/{res['model']}", "三路审稿诊断", req.title[:32])
        return {"audit": parsed, "backend": res["backend"], "model": res["model"]}

    @app.post("/api/ai/wendy")
    def ai_wendy(req: AIRequest) -> dict[str, Any]:
        topics_cnt = conn.execute("SELECT COUNT(*) FROM topics WHERE trash=0").fetchone()[0]
        prompt = (
            f"你是 Park Studio 的本地内容助理 Wendy。回答简洁务实、像一起干活的搭档，不超过 120 字。\n"
            f"{_positioning_text()}\n当前选题池 {topics_cnt} 条，Obsidian 路径：{config.load_config().get('obsidianPath')}。\n"
            f"用户问：{req.prompt}"
        )
        try:
            res = ai.run_prompt(prompt)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        return {"reply": res["text"], "backend": res["backend"], "model": res["model"]}

    # ---------- 资产 CRUD & 系统配置 ----------
    @app.post("/api/said")
    def add_said(req: SaidCreate) -> dict[str, Any]:
        ts = db.now_iso()
        cur = conn.execute("INSERT INTO said(topic, text, source, muted, created_at) VALUES (?,?,?,0,?)",
                           (req.topic.strip() or "实战记录", req.text.strip(), req.source, ts))
        conn.commit()
        return {"id": cur.lastrowid, "topic": req.topic, "text": req.text.strip(), "from": req.source, "muted": False}

    @app.post("/api/said/{said_id}/toggle")
    def toggle_said(said_id: int) -> dict[str, Any]:
        r = conn.execute("SELECT muted FROM said WHERE id=?", (said_id,)).fetchone()
        if not r:
            raise HTTPException(404, "不存在")
        nxt = 0 if r["muted"] else 1
        conn.execute("UPDATE said SET muted=? WHERE id=?", (nxt, said_id))
        conn.commit()
        return {"id": said_id, "muted": bool(nxt)}

    @app.post("/api/clients")
    def add_client(req: ClientCreate) -> dict[str, Any]:
        ts = db.now_iso()
        cur = conn.execute("INSERT INTO clients(name, niche, stage, amount, source, next_step, note, created_at) VALUES (?,?,'新线索',0,?,'待沟通',?,?)",
                           (req.name.strip(), req.niche, req.source, req.note, ts))
        conn.commit()
        return {"id": cur.lastrowid, "name": req.name.strip(), "niche": req.niche, "stage": "新线索", "amount": 0, "source": req.source, "next": "待沟通", "note": req.note}

    @app.put("/api/positioning")
    def save_positioning(body: dict[str, Any]) -> dict[str, Any]:
        conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('positioning', ?)", (json.dumps(body, ensure_ascii=False),))
        conn.commit()
        return body

    @app.put("/api/settings")
    def put_settings(patch: dict[str, Any]) -> dict[str, Any]:
        merged = config.save_config(patch)
        db.log_event(conn, "系统", "配置", "保存本地配置", f"AI={merged.get('aiBackend')}/{merged.get('aiModel')}")
        return {
            "config": merged,
            "vaultStatus": vault.vault_status(merged),
            "chromeStatus": cdp.chrome_status(merged),
            "agents": ai.detect_agents(),
        }

    # ---------- Step 2：统一专用 Chrome CDP + 7 平台真实体检、登录与粉丝采集 ----------
    def _recent_logs() -> list[dict[str, Any]]:
        return [
            {"ts": r["ts"], "ep": r["episode"], "plat": r["platform"], "action": r["action"], "result": r["result"]}
            for r in conn.execute("SELECT * FROM daemon_logs ORDER BY id DESC LIMIT 30").fetchall()
        ]

    @app.get("/api/system/status")
    def system_status() -> dict[str, Any]:
        cfg = config.load_config()
        lm = conn.execute("SELECT v FROM kv WHERE k='last_metrics_at'").fetchone()
        return {
            "chromeStatus": cdp.chrome_status(cfg),
            "vaultStatus": vault.vault_status(cfg),
            "platformStatus": platforms.get_platform_status_map(conn),
            "daemonLogs": _recent_logs(),
            "lastMetricsAt": lm["v"] if lm else "",
        }

    @app.post("/api/chrome/launch")
    def chrome_launch(foreground: bool = True) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            st = cdp.ensure_chrome(cfg, foreground=foreground)
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        db.log_event(conn, "系统", "Chrome", "启动专用浏览器", f"CDP :{st['port']} 在线")
        return {"ok": True, "chromeStatus": st, "daemonLogs": _recent_logs()}

    @app.post("/api/platforms/login")
    async def api_platforms_login(req: PlatformActionReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await platforms.open_login_pages(req.platforms if req else None, conn, cfg=cfg)
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        return {**res, "chromeStatus": cdp.chrome_status(cfg), "daemonLogs": _recent_logs()}

    @app.post("/api/platforms/check")
    async def api_platforms_check(req: PlatformActionReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await platforms.check_platforms(req.platforms if req else None, conn, cfg=cfg)
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        return {
            **res,
            "platformStatus": platforms.get_platform_status_map(conn),
            "chromeStatus": cdp.chrome_status(cfg),
            "daemonLogs": _recent_logs(),
        }

    @app.patch("/api/platforms/{pid}")
    def api_platform_toggle(pid: str, req: PlatformToggleReq) -> dict[str, Any]:
        if pid not in platforms.PLATFORM_SPECS:
            raise HTTPException(404, "未知平台")
        ts = db.now_iso()
        conn.execute(
            """INSERT INTO platform_status(platform, state, detail, disabled, checked_at, updated_at)
               VALUES (?,'warn','未体检',?,'未检查',?)
               ON CONFLICT(platform) DO UPDATE SET disabled=excluded.disabled, updated_at=excluded.updated_at""",
            (pid, int(req.disabled), ts),
        )
        conn.commit()
        name = platforms.PLATFORM_SPECS[pid]["name"]
        db.log_event(conn, "系统", name, "平台开关", "已停用" if req.disabled else "已启用")
        return {"ok": True, "platformStatus": platforms.get_platform_status_map(conn), "daemonLogs": _recent_logs()}

    @app.post("/api/collect/followers")
    async def api_collect_followers(req: PlatformActionReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await platforms.collect_followers(req.platforms if req else None, conn, cfg=cfg)
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        return {
            **res,
            "followersLive": platforms.get_followers_map(conn, days=30),
            "chromeStatus": cdp.chrome_status(cfg),
            "daemonLogs": _recent_logs(),
        }

    @app.post("/api/feishu/test")
    def api_feishu_test(req: FeishuTestReq) -> dict[str, Any]:
        cfg = config.load_config()
        hook = req.webhook.strip() or str(cfg.get("feishuWebhook") or "").strip()
        try:
            res = platforms.send_feishu_test(hook)
        except Exception as exc:
            raise HTTPException(400, str(exc)) from exc
        db.log_event(conn, "系统", "飞书", "测试发送", "连通成功")
        return {**res, "daemonLogs": _recent_logs()}

    # ---------- 静态前端托管 ----------
    app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="js")
    app.mount("/img", StaticFiles(directory=str(STATIC_DIR / "img")), name="img")

    @app.get("/")
    def index():
        return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-store"})

    return app
