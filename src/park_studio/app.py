"""Park Studio FastAPI 后端：真实 SQLite 持久化 + Obsidian 只读扫描 + 本地 AI CLI（Gemini/Claude/Codex）+ worktable.json 导出。"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import ai, benchmarks, cdp, config, cutter, daemon, dailies, db, materials, metrics, platforms, projects, publisher, studiopos, vault

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
    title: str | None = None
    density: str | None = None
    burn_subs: bool | None = None
    hook_idx: list[int] | None = None
    drop_idx: list[int] | None = None
    pause_s: float | None = None
    mode: str | None = None
    shots: list[dict[str, Any]] | None = None
    status: str | None = None


class CutImportMediaReq(BaseModel):
    video_path: str = ""
    srt_path: str = ""
    title: str = ""
    mode: str = "rough"


class CutTranscribeReq(BaseModel):
    video_path: str = ""
    lang: str = "zh"
    model: str = ""


class CutRenderReq(BaseModel):
    mode: str = "rough"
    drop_idx: list[int] | None = None
    hook_idx: list[int] | None = None
    pause_s: float | None = None
    burn_subs: bool | None = None


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


class PackEpisodeReq(BaseModel):
    video_path: str | None = None
    cover_v_path: str | None = None
    cover_h_path: str | None = None
    schedule: str | None = None
    publish_json: dict[str, Any] | None = None


class PublishPlatformReq(BaseModel):
    platform: str


class MarkPublishReq(BaseModel):
    platform: str
    state: str = "published"
    url: str = ""
    detail: str = ""


class ImportProjectReq(BaseModel):
    folder: str


class MoneyCardStateReq(BaseModel):
    id: str
    state: str


class StudioPosEditReq(BaseModel):
    path: list[Any]
    value: Any


class StudioPosAppliedReq(BaseModel):
    key: str


class BenchmarkAccountReq(BaseModel):
    name: str
    platform: str = "douyin"
    url: str


class BenchmarkTeardownReq(BaseModel):
    title: str
    author: str = ""
    url: str = ""
    transcript: str = ""
    mode: str = ""
    modules: list[str] | None = None
    custom_prompt: str = ""


class AITestReq(BaseModel):
    aiBackend: str | None = None
    aiModel: str | None = None
    apiBaseUrl: str | None = None
    apiKey: str | None = None
    apiModel: str | None = None
    geminiApiKey: str | None = None


class OnboardingCompleteReq(BaseModel):
    platforms: list[str]
    aiBackend: str | None = None
    aiModel: str | None = None


class KbFoldersReq(BaseModel):
    enabled: list[str]


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
        plat_status = platforms.get_platform_status_map(conn)
        already_checked = any(
            (v.get("checkedAt") or "") not in ("", "未检查", "未启用")
            for v in plat_status.values()
        )
        needs_onboarding = (not bool(cfg.get("onboardingDone"))) and (not already_checked)
        return {
            "config": cfg,
            "needsOnboarding": needs_onboarding,
            "vaultStatus": vault.vault_status(cfg),
            "chromeStatus": cdp.chrome_status(cfg),
            "platformStatus": plat_status,
            "publishEpisodes": publisher.list_episodes(conn),
            "projects": projects.scan_projects(cfg, limit=25),
            "launchd": daemon.daemon_status(),
            "followersLive": followers_live,
            "hasLiveFollowers": bool(followers_live),
            "analytics": metrics.build_analytics(conn),
            "lastMetricsAt": last_metrics_at,
            "agents": ai.detect_agents(),
            "newsletterIssue": vault.parse_newsletter_issue(None, cfg=cfg),
            "savedDaily": dailies.get_saved_daily(None, conn=conn, cfg=cfg),
            "devDaily": dailies.get_dev_daily(cfg=cfg, days=14),
            "vault": {
                "newsletter": vault.scan_bucket("newsletter", limit=15, cfg=cfg),
                "saved": vault.scan_bucket("saved", limit=25, cfg=cfg),
                "writing": vault.scan_bucket("writing", limit=25, cfg=cfg),
                "kline": vault.scan_bucket("kline", limit=10, cfg=cfg),
            },
            "topics": topics,
            "cutProject": (
                {
                    **cuts[0],
                    **(
                        json.loads(r["v"])
                        if (r := conn.execute("SELECT v FROM kv WHERE k=?", (f"cut_meta:{cuts[0]['id']}",)).fetchone())
                        else {"mode": "rough", "dropIdx": [], "pauseS": 0.8, "srtPath": "", "outputPath": "", "publishFolder": "", "hasRealTranscript": False}
                    ),
                }
                if cuts
                else None
            ),
            "said": said,
            "tree": tree,
            "clients": clients,
            "daemonLogs": logs,
            "positioning": positioning,
            "studioPositioning": studiopos.load_studio_positioning(conn, cfg),
            "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg, limit=80),
            "kb": vault.list_kb_folders(cfg),
            "materials": materials.get_materials(kind="image", limit=24, cfg=cfg),
            "cutEnv": cutter.check_env(cfg),
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

    # ---------- 搞钱日报（Pete 卡 + 收藏按天一期） & 开发日报（本地 Git 变更） ----------
    @app.get("/api/source/saved")
    def get_saved_daily_api(day: str | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        return dailies.get_saved_daily(day, conn=conn, cfg=cfg)

    @app.post("/api/source/moneycard-state")
    def set_moneycard_state_api(req: MoneyCardStateReq) -> dict[str, Any]:
        try:
            dailies.set_card_state(conn, req.id, req.state)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {"ok": True, "id": req.id, "state": req.state}

    @app.get("/api/source/pete-image")
    def get_pete_image(path: str):
        cfg = config.load_config()
        pics_root = (dailies.pete_dir(cfg) / "图").resolve()
        if not pics_root.is_dir():
            raise HTTPException(404, "找不到配图目录")
        target = (pics_root / path).resolve()
        if pics_root not in target.parents or not target.is_file():
            raise HTTPException(404, "找不到配图")
        return FileResponse(target)

    # ---------- 对标爆款库（002_对标内容 + 追踪账号 CDP 抓取 + 本地 Agent 拆解） ----------
    @app.get("/api/benchmarks")
    def api_list_benchmarks(author: str = "", sort: str = "multiple", limit: int = 120) -> dict[str, Any]:
        cfg = config.load_config()
        return benchmarks.list_benchmarks(conn, cfg=cfg, author=author, sort=sort, limit=limit)

    @app.get("/api/benchmarks/detail")
    def api_benchmark_detail(id: str) -> dict[str, Any]:
        cfg = config.load_config()
        item = benchmarks.get_benchmark_detail(conn, id, cfg=cfg)
        if item is None:
            raise HTTPException(404, "找不到该对标作品")
        return item

    @app.post("/api/benchmarks/accounts")
    def api_add_benchmark_account(req: BenchmarkAccountReq) -> dict[str, Any]:
        if not req.name.strip() or not req.url.strip():
            raise HTTPException(400, "账号名和主页链接不能为空")
        acc = benchmarks.add_benchmark_account(conn, req.name, req.platform, req.url)
        cfg = config.load_config()
        return {"ok": True, "account": acc, "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg)}

    @app.delete("/api/benchmarks/accounts/{acc_id}")
    def api_del_benchmark_account(acc_id: int) -> dict[str, Any]:
        benchmarks.delete_benchmark_account(conn, acc_id)
        cfg = config.load_config()
        return {"ok": True, "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg)}

    @app.post("/api/benchmarks/accounts/{acc_id}/fetch")
    async def api_fetch_benchmark_account(acc_id: int) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await benchmarks.fetch_account_works_cdp(conn, acc_id, cfg=cfg)
        except Exception as exc:
            raise HTTPException(400, str(exc)) from exc
        return {**res, "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg), "daemonLogs": _recent_logs()}

    @app.post("/api/benchmarks/teardown")
    def api_teardown_benchmark(req: BenchmarkTeardownReq) -> dict[str, Any]:
        if not req.title.strip():
            raise HTTPException(400, "标题不能为空")
        cfg = config.load_config()
        try:
            res = benchmarks.ai_teardown_benchmark(
                conn,
                title=req.title,
                author=req.author,
                url=req.url,
                transcript=req.transcript,
                positioning_text=_positioning_text(),
                mode=req.mode,
                modules=req.modules,
                custom_prompt=req.custom_prompt,
                cfg=cfg,
            )
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        return {**res, "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg)}

    # ---------- 视觉素材库（四大类：图片 / 视频动效 / 做视频 / 视频案例 2,656+） ----------
    @app.get("/api/materials")
    def api_materials(kind: str = "image", cat: str = "", q: str = "", offset: int = 0, limit: int = 48) -> dict[str, Any]:
        cfg = config.load_config()
        return materials.get_materials(kind=kind, cat=cat, q=q, offset=offset, limit=limit, cfg=cfg)

    @app.get("/api/materials/asset")
    def api_material_asset(folder: str, file: str) -> FileResponse:
        cfg = config.load_config()
        target = materials.resolve_asset(folder, file, cfg=cfg)
        if target is None:
            raise HTTPException(404, "素材预览不存在")
        return FileResponse(target)

    # ---------- Obsidian 知识库文件夹总览与检索（替代零散「说过的话」） ----------
    @app.get("/api/kb/folders")
    def api_kb_folders() -> dict[str, Any]:
        cfg = config.load_config()
        return vault.list_kb_folders(cfg)

    @app.get("/api/kb/notes")
    def api_kb_notes(folder: str = "", q: str = "", limit: int = 50) -> dict[str, Any]:
        cfg = config.load_config()
        return vault.scan_kb_folder(folder, q=q, limit=limit, cfg=cfg)

    @app.put("/api/kb/folders")
    def api_kb_toggle_folders(req: KbFoldersReq) -> dict[str, Any]:
        cfg = config.save_config({"kbEnabledFolders": req.enabled})
        db.log_event(conn, "知识库", "Obsidian", "更新接入文件夹", f"已启用 {len(req.enabled)} 个文件夹")
        return {"ok": True, "kb": vault.list_kb_folders(cfg)}

    @app.get("/api/source/dev")
    def get_dev_daily_api(days: int = 14) -> dict[str, Any]:
        cfg = config.load_config()
        return dailies.get_dev_daily(cfg=cfg, days=days)

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
            try:
                ep_dir = projects.scaffold_episode_dir(title, script_body=body)
                db.log_event(conn, f"#{topic_id}", "工程包", "定稿并建标准目录", ep_dir.name[:44])
            except OSError:
                db.log_event(conn, f"#{topic_id}", "选题台", "稿子定稿", title[:40])
        return _row_topic(conn.execute("SELECT * FROM topics WHERE id=?", (topic_id,)).fetchone())

    # ---------- 双模式真实本地剪辑引擎（一键粗剪 + 高级动效模式 + 独立剪辑 Agent + 实时任务日志） ----------
    def _load_cut_meta(cut_id: int) -> dict[str, Any]:
        r = conn.execute("SELECT v FROM kv WHERE k=?", (f"cut_meta:{cut_id}",)).fetchone()
        if not r:
            return {"mode": "rough", "dropIdx": [], "pauseS": 0.8, "srtPath": "", "outputPath": "", "publishFolder": "", "videoInfo": None, "hasRealTranscript": False}
        try:
            d = json.loads(r["v"])
            return d if isinstance(d, dict) else {}
        except Exception:
            return {}

    def _save_cut_meta(c: sqlite3.Connection, cut_id: int, patch: dict[str, Any]) -> dict[str, Any]:
        r = c.execute("SELECT v FROM kv WHERE k=?", (f"cut_meta:{cut_id}",)).fetchone()
        cur = json.loads(r["v"]) if r else {}
        merged = {**cur, **patch}
        c.execute("INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)", (f"cut_meta:{cut_id}", json.dumps(merged, ensure_ascii=False)))
        c.commit()
        return merged

    def _load_cut_plan(cut_id: int) -> dict[str, Any] | None:
        r = conn.execute("SELECT v FROM kv WHERE k=?", (f"cut_plan:{cut_id}",)).fetchone()
        if not r:
            return None
        try:
            return json.loads(r["v"])
        except Exception:
            return None

    def _full_cut(cut_id: int) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        base = _row_cut(row)
        meta = _load_cut_meta(cut_id)
        return {**base, **meta}

    @app.get("/api/cut/env")
    def api_cut_env() -> dict[str, Any]:
        return cutter.check_env(config.load_config())

    @app.get("/api/cut/{cut_id}")
    def api_get_cut(cut_id: int) -> dict[str, Any]:
        return _full_cut(cut_id)

    @app.patch("/api/cut/{cut_id}")
    def update_cut(cut_id: int, req: CutUpdate) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        ts = db.now_iso()
        title = req.title if req.title is not None else row["title"]
        density = req.density if req.density is not None else row["density"]
        burn_subs = int(req.burn_subs) if req.burn_subs is not None else row["burn_subs"]
        hook_idx_json = json.dumps(req.hook_idx) if req.hook_idx is not None else row["hook_idx_json"]
        shots_json = json.dumps(req.shots, ensure_ascii=False) if req.shots is not None else row["shots_json"]
        status = req.status if req.status is not None else row["status"]
        conn.execute(
            "UPDATE cut_projects SET title=?, density=?, burn_subs=?, hook_idx_json=?, shots_json=?, status=?, updated_at=? WHERE id=?",
            (title, density, burn_subs, hook_idx_json, shots_json, status, ts, cut_id),
        )
        conn.commit()
        meta_patch: dict[str, Any] = {}
        if req.drop_idx is not None:
            meta_patch["dropIdx"] = req.drop_idx
        if req.pause_s is not None:
            meta_patch["pauseS"] = float(req.pause_s)
        if req.mode is not None:
            meta_patch["mode"] = req.mode
        if meta_patch:
            _save_cut_meta(conn, cut_id, meta_patch)
        return _full_cut(cut_id)

    @app.post("/api/cut/{cut_id}/import-media")
    def api_cut_import_media(cut_id: int, req: CutImportMediaReq) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        vp_str = req.video_path.strip()
        srt_str = req.srt_path.strip()
        if not vp_str and not srt_str:
            raise HTTPException(400, "请填写本地视频路径（.mp4/.mov）或字幕路径（.srt）")

        vinfo = None
        dur_txt = row["duration"]
        title = req.title.strip() or row["title"]
        if vp_str:
            vp = Path(vp_str).expanduser()
            try:
                vinfo = cutter.probe_video(vp)
            except cutter.CutError as exc:
                raise HTTPException(400, str(exc)) from exc
            dur_txt = vinfo["durationText"]
            if not req.title.strip():
                title = vp.stem
            # 若同目录下或 subtitles/ 下自动存在 .srt 且用户未指定，自动顺带载入
            if not srt_str:
                for cand in (vp.with_suffix(".srt"), vp.parent / "subtitles" / "source.srt"):
                    if cand.is_file():
                        srt_str = str(cand)
                        break

        prev_src = str(row["source_file"] or "")
        src_changed = bool(vp_str and vp_str != prev_src)
        meta_patch: dict[str, Any] = {
            "mode": req.mode or ("motion" if srt_str else "rough"),
            "srtPath": srt_str,
            "videoInfo": vinfo,
        }
        lines_json = "[]" if (src_changed and not srt_str) else row["lines_json"]
        if src_changed:
            meta_patch["dropIdx"] = []
            meta_patch["outputPath"] = ""
            meta_patch["publishFolder"] = ""
            meta_patch["hasRealTranscript"] = bool(srt_str)
            if not srt_str:
                conn.execute("DELETE FROM kv WHERE k=?", (f"cut_plan:{cut_id}",))

        if srt_str:
            try:
                plan_data = cutter.parse_srt(Path(srt_str).expanduser())
            except cutter.CutError as exc:
                raise HTTPException(400, str(exc)) from exc
            conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)", (f"cut_plan:{cut_id}", json.dumps(plan_data, ensure_ascii=False)))
            lines_json = json.dumps(plan_data["lines"], ensure_ascii=False)
            meta_patch["dropIdx"] = plan_data["drop"]
            meta_patch["hasRealTranscript"] = True

        if src_changed or srt_str:
            conn.execute(
                "UPDATE cut_projects SET title=?, source_file=?, duration=?, lines_json=?, hook_idx_json='[]', shots_json='[]', worktable_path='', status='editing', updated_at=? WHERE id=?",
                (title, vp_str or row["source_file"], dur_txt, lines_json, db.now_iso(), cut_id),
            )
        else:
            conn.execute(
                "UPDATE cut_projects SET title=?, source_file=?, duration=?, lines_json=?, updated_at=? WHERE id=?",
                (title, vp_str or row["source_file"], dur_txt, lines_json, db.now_iso(), cut_id),
            )
        conn.commit()
        _save_cut_meta(conn, cut_id, meta_patch)
        db.log_event(conn, f"EP{row['episode']}", "剪辑台", "导入原片/SRT", Path(vp_str or srt_str).name[:44])
        return {"ok": True, "cutProject": _full_cut(cut_id)}

    @app.post("/api/cut/{cut_id}/transcribe")
    def api_cut_transcribe(cut_id: int, req: CutTranscribeReq | None = None) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        vp_str = (req.video_path.strip() if req and req.video_path else "") or str(row["source_file"] or "")
        vp = Path(vp_str).expanduser()
        if not vp_str or not vp.is_file():
            raise HTTPException(400, f"找不到本地原片文件：{vp_str or '请先导入原片路径'}")
        cfg = config.load_config()
        lang = req.lang if req else "zh"
        model = req.model if req else ""

        def run_job(log_fn) -> dict[str, Any]:
            vinfo = cutter.probe_video(vp)
            tr = cutter.transcribe_video(vp, cfg=cfg, lang=lang, model=model, log=log_fn)
            plan_data = cutter.build_plan_from_transcript(tr)
            # 保存 transcript.json & plan.json 到 ~/.park-studio/projects/EPxx/
            ep_dir = config.projects_dir() / f"EP{row['episode']}"
            ep_dir.mkdir(parents=True, exist_ok=True)
            (ep_dir / "transcript.json").write_text(json.dumps(tr, ensure_ascii=False), encoding="utf-8")
            (ep_dir / "plan.json").write_text(json.dumps(plan_data, ensure_ascii=False), encoding="utf-8")

            c2 = db.connect(db_file)
            try:
                c2.execute("INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)", (f"cut_plan:{cut_id}", json.dumps(plan_data, ensure_ascii=False)))
                c2.execute(
                    "UPDATE cut_projects SET source_file=?, duration=?, lines_json=?, hook_idx_json='[]', shots_json='[]', worktable_path='', status='editing', updated_at=? WHERE id=?",
                    (str(vp), vinfo["durationText"], json.dumps(plan_data["lines"], ensure_ascii=False), db.now_iso(), cut_id),
                )
                c2.commit()
                _save_cut_meta(c2, cut_id, {
                    "dropIdx": plan_data["drop"],
                    "videoInfo": vinfo,
                    "hasRealTranscript": True,
                    "outputPath": "",
                    "publishFolder": "",
                })
                db.log_event(c2, f"EP{row['episode']}", tr.get("engine", "whisper"), "本地转写与口误分析", f"{len(plan_data['lines'])} 句 · 标出 {len(plan_data['drop'])} 处可剪")
            finally:
                c2.close()
            log_fn(f"分析完成：共 {len(plan_data['lines'])} 句，自动标出 {len(plan_data['drop'])} 处重来/语气词可剪")
            return {"linesCount": len(plan_data["lines"]), "dropCount": len(plan_data["drop"]), "engine": tr.get("engine")}

        job = cutter.JOBS.start("transcribe", f"本地转写 {vp.name}", run_job)
        return {"ok": True, "job": job}

    @app.post("/api/cut/{cut_id}/ai-plan")
    def api_cut_ai_plan(cut_id: int) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        plan_data = _load_cut_plan(cut_id)
        if not plan_data:
            # 若还没有转写，尝试直接用当前 lines
            lines = json.loads(row["lines_json"] or "[]")
            if not lines:
                raise HTTPException(400, "请先导入原片并转写（或导入 .srt），再让剪辑 Agent 排镜头表")
            plan_data = {"lines": lines, "drop": _load_cut_meta(cut_id).get("dropIdx") or []}
        cfg = config.load_config()
        pos_txt = _positioning_text()

        def run_job(log_fn) -> dict[str, Any]:
            eff = cfg.get("cutAgentBackend") or "inherit"
            log_fn(f"正在调用独立剪辑 Agent（{eff}）分析逐字稿、挑 Hook 并排动效镜头表…")
            res = cutter.ai_plan_shots(plan_data, title=row["title"], density=row["density"], cfg=cfg, positioning_text=pos_txt)
            # 将镜头编号反写回对应逐字稿行
            lines = list(plan_data.get("lines") or [])
            for ln in lines:
                ln["shot"] = 0
            for sh in res["shots"]:
                for ln in lines:
                    if ln["i"] == sh.get("line_idx"):
                        ln["shot"] = sh["id"]
                        break
            c2 = db.connect(db_file)
            try:
                c2.execute(
                    "UPDATE cut_projects SET hook_idx_json=?, shots_json=?, lines_json=?, updated_at=? WHERE id=?",
                    (json.dumps(res["hooks"]), json.dumps(res["shots"], ensure_ascii=False), json.dumps(lines, ensure_ascii=False), db.now_iso(), cut_id),
                )
                c2.commit()
                db.log_event(c2, f"EP{row['episode']}", f"{res['backend']}/{res['model']}", "独立剪辑 Agent 排镜头", f"Hook {len(res['hooks'])} 句 · {len(res['shots'])} 镜")
            finally:
                c2.close()
            log_fn(f"规划完成 ✓ 挑出 {len(res['hooks'])} 句原话 Hook + {len(res['shots'])} 个动效镜头（{res['backend']}/{res['model']}）")
            return res

        job = cutter.JOBS.start("ai_plan", f"独立剪辑 Agent 排镜头表", run_job)
        return {"ok": True, "job": job}

    @app.post("/api/cut/{cut_id}/render")
    def api_cut_render(cut_id: int, req: CutRenderReq | None = None) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        meta = _load_cut_meta(cut_id)
        mode = (req.mode if req and req.mode else None) or meta.get("mode") or "rough"
        vp = Path(str(row["source_file"] or "")).expanduser()
        if not str(row["source_file"] or "").strip() or not vp.is_file():
            raise HTTPException(400, f"找不到本地原片文件：{row['source_file'] or '请先导入原片'}")
        cfg = config.load_config()
        drop = req.drop_idx if (req and req.drop_idx is not None) else (meta.get("dropIdx") or [])
        hooks = req.hook_idx if (req and req.hook_idx is not None) else json.loads(row["hook_idx_json"] or "[]")
        pause_s = float(req.pause_s if (req and req.pause_s is not None) else (meta.get("pauseS") or 0.8))
        burn_subs = bool(req.burn_subs if (req and req.burn_subs is not None) else row["burn_subs"])

        if mode == "rough":
            plan_data = _load_cut_plan(cut_id)
            if not plan_data or not plan_data.get("sentences"):
                raise HTTPException(400, "尚未完成本机语音转写（请先点「1. 本地转写与口误分析」）")

            def run_rough(log_fn) -> dict[str, Any]:
                ep_dir = config.projects_dir() / f"EP{row['episode']}"
                ep_dir.mkdir(parents=True, exist_ok=True)
                tmp_out = ep_dir / "rendered.mp4"
                r_res = cutter.render_rough_cut(vp, plan_data, tmp_out, drop=drop, hooks=hooks, pause_s=pause_s, burn_subs=burn_subs, log=log_fn)
                c2 = db.connect(db_file)
                try:
                    landed = cutter.land_into_publish_project(c2, title=row["title"], rendered_mp4=tmp_out, cfg=cfg, log=log_fn)
                    c2.execute("UPDATE cut_projects SET status='done', updated_at=? WHERE id=?", (db.now_iso(), cut_id))
                    c2.commit()
                    _save_cut_meta(c2, cut_id, {
                        "outputPath": landed["videoPath"],
                        "publishFolder": landed["folder"],
                        "dropIdx": drop,
                        "pauseS": pause_s,
                    })
                    db.log_event(c2, f"EP{row['episode']}", "一键粗剪", "渲染成片并落盘", f"{r_res['durationText']} · {r_res['sizeMb']}MB")
                finally:
                    c2.close()
                return {**r_res, **landed}

            job = cutter.JOBS.start("render_rough", f"一键粗剪渲染 · {row['title'][:20]}", run_rough)
            return {"ok": True, "job": job}

        # 高级动效模式：导出 worktable.json + 后台触发独立剪辑 Agent
        wt = export_worktable(cut_id)

        def run_motion_agent(log_fn) -> dict[str, Any]:
            wt_path = wt["path"]
            log_fn(f"已导出标准镜头表：{wt_path}")
            cut_backend = str(cfg.get("cutAgentBackend") or "inherit")
            log_fn(f"正在通过独立剪辑 Agent（{cut_backend}）执行高级动效方案…")
            prompt = (
                f"请读取 {wt_path} 中的 Hook 与镜头表（Spec Table），原片路径为 {vp}，"
                f"字幕烧录={burn_subs}。请输出剪辑执行计划与下一步命令（成片请输出到统一工程目录 final/上传/）。"
            )
            res = ai.run_cut_prompt(prompt, cfg=cfg, timeout=180)
            log_fn(f"独立剪辑 Agent 执行完毕（{res['backend']}/{res['model']}）")
            return {"worktablePath": wt_path, "agentReply": res["text"], "backend": res["backend"], "model": res["model"]}

        job = cutter.JOBS.start("render_motion", f"高级动效 Agent · {row['title'][:20]}", run_motion_agent)
        return {"ok": True, "job": job}

    @app.get("/api/cut/jobs/{job_id}")
    def api_cut_job(job_id: str) -> dict[str, Any]:
        job = cutter.JOBS.get(job_id)
        if not job:
            raise HTTPException(404, "找不到该剪辑任务")
        return job

    @app.post("/api/cut/{cut_id}/export-worktable")
    def export_worktable(cut_id: int) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        cut = _full_cut(cut_id)
        ep_dir = config.projects_dir() / f"EP{cut['episode']}"
        ep_dir.mkdir(parents=True, exist_ok=True)
        out_path = ep_dir / "worktable.json"
        payload = {
            "schema": "park-studio/worktable/v1",
            "episode": cut["episode"],
            "title": cut["title"],
            "mode": cut.get("mode", "rough"),
            "source_file": cut["sourceFile"],
            "srt_path": cut.get("srtPath", ""),
            "burn_subtitles": cut["burnSubs"],
            "pause_s": cut.get("pauseS", 0.8),
            "density": cut["density"],
            "drop_idx": cut.get("dropIdx", []),
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
        sp = studiopos.load_studio_positioning(conn)
        if sp and sp.get("positioning"):
            p = sp["positioning"]
            co = p.get("company") or {}
            qs = "；".join(f"{q.get('label', '')}：{q.get('title', '')}" for q in (p.get("questions") or [])[:3])
            diffs = "；".join(d.get("h", "") for d in (p.get("diff") or [])[:3])
            return f"创作者定位：{co.get('name', '')}（{co.get('core_title', '')}，{co.get('core_line', '')}）；{qs}；差异化：{diffs}"
        r = conn.execute("SELECT v FROM kv WHERE k='positioning'").fetchone()
        if not r:
            return ""
        pos = json.loads(r["v"])
        return f"创作者定位：{pos.get('who', '')}；差异化：{pos.get('diff', '')}；原则：{pos.get('rules', '')}"

    def _said_text() -> str:
        rows = conn.execute("SELECT topic, text FROM said WHERE muted=0 ORDER BY id DESC LIMIT 12").fetchall()
        return "\n".join(f"- [{r['topic']}] {r['text']}" for r in rows)

    @app.post("/api/onboarding/complete")
    def api_onboarding_complete(req: OnboardingCompleteReq) -> dict[str, Any]:
        enabled = [p for p in platforms.PLAT_ORDER if p in set(req.platforms or [])]
        enabled_set = set(enabled)
        for pid in platforms.PLAT_ORDER:
            conn.execute(
                "UPDATE platform_status SET disabled=? WHERE platform=?",
                (0 if pid in enabled_set else 1, pid),
            )
        conn.commit()
        patch: dict[str, Any] = {"onboardingDone": True}
        if req.aiBackend:
            patch["aiBackend"] = req.aiBackend
        if req.aiModel is not None:
            patch["aiModel"] = req.aiModel
        cfg = config.save_config(patch)
        names = "、".join(platforms.PLATFORM_SPECS[p]["name"] for p in enabled) or "暂不启用平台"
        db.log_event(conn, "引导", f"{len(enabled)}/{len(platforms.PLAT_ORDER)} 平台", "完成平台按需选择", names[:60])
        return {
            "ok": True,
            "enabled": enabled,
            "needsOnboarding": False,
            "platformStatus": platforms.get_platform_status_map(conn),
            "config": cfg,
            "daemonLogs": _recent_logs(),
        }

    @app.post("/api/ai/test")
    def api_ai_test(req: AITestReq | None = None) -> dict[str, Any]:
        import time as _time
        cfg = config.load_config()
        if req is not None:
            for k in ("aiBackend", "aiModel", "apiBaseUrl", "apiKey", "apiModel", "geminiApiKey"):
                v = getattr(req, k, None)
                if v is not None:
                    cfg[k] = v
        t0 = _time.monotonic()
        try:
            res = ai.run_prompt("请只回复 OK", cfg=cfg, timeout=25)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        ms = int((_time.monotonic() - t0) * 1000)
        db.log_event(conn, "AI", f"{res['backend']}/{res['model']}", "连通性测试", f"成功 · {ms}ms")
        return {
            "ok": True,
            "backend": res["backend"],
            "model": res["model"],
            "reply": res["text"][:120],
            "latencyMs": ms,
        }

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

    @app.get("/api/studio-positioning")
    def get_studio_positioning() -> dict[str, Any]:
        cfg = config.load_config()
        return {"studio": studiopos.load_studio_positioning(conn, cfg)}

    @app.put("/api/studio-positioning")
    def put_studio_positioning(req: StudioPosEditReq) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            st = studiopos.update_studio_field(conn, req.path, req.value, cfg=cfg)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {"studio": st}

    @app.post("/api/studio-positioning/reload")
    def reload_studio_positioning() -> dict[str, Any]:
        cfg = config.load_config()
        return {"studio": studiopos.load_studio_positioning(conn, cfg, force_reload=True)}

    @app.post("/api/studio-positioning/applied")
    def applied_studio_positioning(req: StudioPosAppliedReq) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            st = studiopos.mark_profile_applied(conn, req.key, cfg=cfg)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {"studio": st}

    @app.get("/api/studio-positioning/file")
    def get_studio_persona_file(path: str) -> FileResponse:
        cfg = config.load_config()
        resolved = studiopos.resolve_persona_file(path, cfg=cfg)
        if resolved is None:
            raise HTTPException(404, "形象配图不存在")
        return FileResponse(resolved)

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
            "analytics": metrics.build_analytics(conn),
            "chromeStatus": cdp.chrome_status(cfg),
            "daemonLogs": _recent_logs(),
        }

    @app.get("/api/metrics/overview")
    def api_metrics_overview() -> dict[str, Any]:
        return metrics.build_analytics(conn)

    @app.post("/api/collect/metrics")
    async def api_collect_metrics(req: PlatformActionReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await metrics.collect_all_works(conn, cfg=cfg, target_platforms=req.platforms if req else None)
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        return {
            **res,
            "chromeStatus": cdp.chrome_status(cfg),
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

    # ---------- Step 3：100% MIT 自研 CDP 自动填表发布引擎 + 标准工程目录扫描 + 自动取链 + launchd ----------
    @app.get("/api/projects")
    def api_projects(limit: int = 30) -> dict[str, Any]:
        cfg = config.load_config()
        return projects.scan_projects(cfg, limit=limit)

    @app.post("/api/publish/from-project")
    def api_publish_from_project(req: ImportProjectReq) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = publisher.import_from_project_dir(conn, req.folder, cfg=cfg)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {
            **res,
            "episodes": publisher.list_episodes(conn),
            "projects": projects.scan_projects(cfg, limit=25),
            "daemonLogs": _recent_logs(),
        }

    @app.get("/api/publish/episodes")
    def api_publish_episodes() -> dict[str, Any]:
        return {"episodes": publisher.list_episodes(conn)}

    @app.post("/api/publish/{episode_id}/pack")
    def api_publish_pack(episode_id: int, req: PackEpisodeReq) -> dict[str, Any]:
        try:
            res = publisher.pack_episode(
                conn,
                episode_id,
                video_path=req.video_path,
                cover_v_path=req.cover_v_path,
                cover_h_path=req.cover_h_path,
                schedule=req.schedule,
                publish_json=req.publish_json,
            )
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from exc
        return {**res, "episodes": publisher.list_episodes(conn), "daemonLogs": _recent_logs()}

    @app.post("/api/publish/{episode_id}/fill")
    async def api_publish_fill(episode_id: int, req: PublishPlatformReq) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await publisher.fill_platform(conn, episode_id, req.platform, cfg=cfg)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        return {
            **res,
            "episodes": publisher.list_episodes(conn),
            "chromeStatus": cdp.chrome_status(cfg),
            "daemonLogs": _recent_logs(),
        }

    @app.post("/api/publish/{episode_id}/sync")
    async def api_publish_sync(episode_id: int, req: PublishPlatformReq) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = await publisher.sync_platform_link(conn, episode_id, req.platform, cfg=cfg)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except Exception as exc:
            raise HTTPException(502, str(exc)) from exc
        return {**res, "episodes": publisher.list_episodes(conn), "daemonLogs": _recent_logs()}

    @app.post("/api/publish/{episode_id}/mark")
    def api_publish_mark(episode_id: int, req: MarkPublishReq) -> dict[str, Any]:
        try:
            res = publisher.mark_platform(
                conn, episode_id, req.platform, state=req.state, url=req.url, detail=req.detail
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {**res, "episodes": publisher.list_episodes(conn), "daemonLogs": _recent_logs()}

    @app.get("/api/publish/{episode_id}/screenshot/{pid}")
    def api_publish_screenshot(episode_id: int, pid: str):
        ep = publisher.get_episode(conn, episode_id)
        if not ep:
            raise HTTPException(404, "期次不存在")
        task = (ep.get("tasks") or {}).get(pid) or {}
        shot = Path(str(task.get("screenshot") or ""))
        if not shot.is_file():
            raise HTTPException(404, "暂无提交前截图")
        return FileResponse(shot, media_type="image/jpeg", headers={"Cache-Control": "no-store"})

    @app.post("/api/daemon/install-launchd")
    def api_install_launchd(load: bool = False) -> dict[str, Any]:
        try:
            st = daemon.install_launchd(port=8792, load=load)
        except Exception as exc:
            raise HTTPException(400, str(exc)) from exc
        db.log_event(conn, "系统", "launchd", "生成开机自启配置", st["plistPath"])
        return {"ok": True, "launchd": st, "daemonLogs": _recent_logs()}

    # ---------- 静态前端托管 ----------
    app.mount("/css", StaticFiles(directory=str(STATIC_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(STATIC_DIR / "js")), name="js")
    app.mount("/img", StaticFiles(directory=str(STATIC_DIR / "img")), name="img")

    @app.get("/")
    def index():
        return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-store"})

    return app
