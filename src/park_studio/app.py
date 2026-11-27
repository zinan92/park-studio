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

from . import ai, benchmarks, cdp, config, covers, cutter, daemon, dailies, db, deps, materials, metrics, platforms, projects, publisher, studiopos, vault

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
    stage: str = "新线索"
    amount: int = 0
    source: str = "自然流量"
    next_step: str = "待沟通"
    note: str = ""


class ClientUpdate(BaseModel):
    name: str | None = None
    niche: str | None = None
    stage: str | None = None
    amount: int | None = None
    source: str | None = None
    next_step: str | None = None
    note: str | None = None


class SiteTestReq(BaseModel):
    siteUrl: str = ""
    siteDashApi: str = "/api/admin/dashboard"


class CookiesPathReq(BaseModel):
    path: str = ""


class EpisodeMergeReq(BaseModel):
    work_keys: list[str]


class EpisodeSplitReq(BaseModel):
    work_key: str


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
    cutAgentBackend: str | None = None
    cutAgentAllowExec: bool | None = None


class LocalizePublishReq(BaseModel):
    platforms: list[str] | None = None
    lang_overrides: dict[str, str] | None = None


class TranslateSrtReq(BaseModel):
    target_lang: str = "en"
    bilingual: bool = False


class DepsInstallReq(BaseModel):
    targets: list[str] | None = None


class CoverGenReq(BaseModel):
    mode: str = "local"
    headline: str = ""
    subtitle: str = ""
    style_hint: str = ""
    frame_ratio: float = 0.28


class BenchmarkUrlReq(BaseModel):
    url: str
    mode: str = ""
    modules: list[str] | None = None
    custom_prompt: str = ""


class ReviewNextTopicsReq(BaseModel):
    title: str
    views: int = 0
    multiple: float = 0.0
    platform: str = "douyin"


class GenerateTitlesReq(BaseModel):
    transcript: str = ""
    angle: str = ""


class PickTitleReq(BaseModel):
    index: int | None = None
    title: str = ""
    cover_text: str = ""


class AutopilotVideoReq(BaseModel):
    video_path: str
    title: str = ""
    burn_subs: bool = True
    generate_covers: bool = True
    localize_copy: bool = True


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


def _parse_ver_tuple(ver: str) -> tuple[int, ...]:
    nums = []
    for part in str(ver or "").lstrip("vV").split("."):
        digits = "".join(ch for ch in part if ch.isdigit())
        nums.append(int(digits) if digits else 0)
    return tuple(nums or [0])


def create_app(db_file: Path | None = None) -> FastAPI:
    from . import __version__

    app = FastAPI(title="Park Studio", version=__version__)
    conn = db.connect(db_file)
    db.init_db(conn)

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        cfg = config.load_config()
        return {
            "ok": True,
            "version": __version__,
            "data_dir": str(config.data_dir()),
            "vault": vault.vault_status(cfg),
            "agents": ai.detect_agents(),
            "active_ai": {"backend": cfg.get("aiBackend"), "model": cfg.get("aiModel")},
        }

    @app.get("/api/app/check-update")
    def api_check_update() -> dict[str, Any]:
        import httpx

        url = "https://api.github.com/repos/zinan92/park-studio/releases/latest"
        try:
            resp = httpx.get(
                url,
                headers={"Accept": "application/vnd.github+json", "User-Agent": f"ParkStudio/{__version__}"},
                timeout=6.0,
            )
            if resp.status_code != 200:
                return {"ok": False, "current": __version__, "latest": __version__, "hasUpdate": False, "error": f"GitHub API HTTP {resp.status_code}"}
            data = resp.json()
            latest_tag = str(data.get("tag_name") or __version__).strip()
            latest_clean = latest_tag.lstrip("vV")
            has_update = _parse_ver_tuple(latest_clean) > _parse_ver_tuple(__version__)
            dmg_url = ""
            for asset in data.get("assets") or []:
                if str(asset.get("name") or "").endswith(".dmg"):
                    dmg_url = str(asset.get("browser_download_url") or "")
                    break
            return {
                "ok": True,
                "current": __version__,
                "latest": latest_clean,
                "tag": latest_tag,
                "hasUpdate": has_update,
                "releaseUrl": str(data.get("html_url") or "https://github.com/zinan92/park-studio/releases/latest"),
                "downloadUrl": dmg_url,
                "publishedAt": str(data.get("published_at") or "")[:10],
            }
        except Exception as exc:
            return {"ok": False, "current": __version__, "latest": __version__, "hasUpdate": False, "error": str(exc)}

    @app.get("/api/bootstrap")
    def bootstrap() -> dict[str, Any]:
        cfg = config.load_config()
        topics = [_row_topic(r) for r in conn.execute("SELECT * FROM topics ORDER BY id DESC").fetchall()]
        cuts = [_row_cut(r) for r in conn.execute("SELECT * FROM cut_projects ORDER BY id DESC").fetchall()]
        said = [
            {"id": r["id"], "topic": r["topic"], "text": r["text"], "from": r["source"], "muted": bool(r["muted"])}
            for r in conn.execute("SELECT * FROM said ORDER BY id DESC").fetchall()
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
            "clients": clients,
            "syncState": db.get_sync_state_map(conn),
            "daemonLogs": logs,
            "positioning": positioning,
            "studioPositioning": studiopos.load_studio_positioning(conn, cfg),
            "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg, limit=80),
            "kb": vault.list_kb_folders(cfg),
            "materials": materials.get_materials(kind="image", limit=24, cfg=cfg),
            "cutEnv": cutter.check_env(cfg),
            "deps": deps.check_all_deps(),
            "lifecycle": _build_lifecycle(cfg),
        }

    def _build_lifecycle(cfg: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """聚合选题、剪辑、发布与复盘为统一的 6 阶段内容全生命周期总览（Content Lifecycle Pipeline）。"""
        ps = platforms.get_platform_status_map(conn)
        active_plats = [p for p in platforms.PLAT_ORDER if not ps.get(p, {}).get("disabled")]
        items: list[dict[str, Any]] = []
        seen_titles: set[str] = set()

        def _norm(s: str) -> str:
            return "".join(ch for ch in (s or "").lower() if ch.isalnum())[:24]

        # 1. 发布期次（最接近闭环的内容排最前）
        for ep in publisher.list_episodes(conn)[:10]:
            t = str(ep.get("title") or ep.get("nick") or "").strip()
            if not t:
                continue
            seen_titles.add(_norm(t))
            pj = ep.get("publishJson") or {}
            pf = ep.get("preflight") or {}
            has_video = bool((pf.get("video") or {}).get("exists"))
            has_cover = bool(pf.get("cover_v") or pf.get("cover_h") or pj.get("cover_169_path"))
            has_localized = bool((pj.get("platforms") or {}))
            has_titles = bool(pj.get("title_candidates") or pj.get("picked_title_idx") is not None)
            tasks = ep.get("tasks") or {}
            pub_done = sum(1 for p in active_plats if (tasks.get(p) or {}).get("state") == "published")
            pub_wait = sum(1 for p in active_plats if (tasks.get(p) or {}).get("state") == "awaiting_user")
            pkg_ready = has_cover and (has_localized or has_titles)

            if pub_done > 0 and pub_wait == 0:
                cur_stage, cur_label, next_label, next_hash = "review", f"已发 {pub_done}/{len(active_plats)} 平台", "看复盘 & 反推下期 ›", "#review"
            elif pub_wait > 0 or (has_video and pkg_ready):
                cur_stage = "publish"
                cur_label = f"待点发 · {pub_wait} 家" if pub_wait else "封面文案齐备 · 待填表"
                next_label, next_hash = ("去确认点发 ›" if pub_wait else "去 Chrome 填表 ›"), "#pub-confirm"
            elif has_video:
                cur_stage, cur_label, next_label, next_hash = "package", "成片就绪 · 待选标题/封面", "选 6 标题 & 出封面 ›", "#pub-pack"
            else:
                cur_stage, cur_label, next_label, next_hash = "cut", "待绑定成片 / 粗剪", "去剪辑工作台 ›", "#cut"

            items.append({
                "id": f"ep:{ep['id']}",
                "kind": "publish",
                "episodeId": ep["id"],
                "episode": ep["episode"],
                "title": t,
                "stages": {
                    "topic": True,
                    "script": True,
                    "cut": has_video,
                    "package": pkg_ready,
                    "publish": pub_done > 0,
                    "review": pub_done > 0,
                },
                "currentStage": cur_stage,
                "currentLabel": cur_label,
                "nextLabel": next_label,
                "nextHash": next_hash,
                "meta": f"EP{ep['episode']} · {pub_done}/{len(active_plats)} 已发",
            })

        # 2. 剪辑中工程（若尚未进入发布表）
        for r in conn.execute("SELECT * FROM cut_projects ORDER BY updated_at DESC LIMIT 3").fetchall():
            t = str(r["title"] or "").strip()
            if not t or _norm(t) in seen_titles:
                continue
            seen_titles.add(_norm(t))
            meta = _load_cut_meta(r["id"])
            has_out = bool(meta.get("outputPath"))
            items.append({
                "id": f"cut:{r['id']}",
                "kind": "cut",
                "cutId": r["id"],
                "title": t,
                "stages": {"topic": True, "script": True, "cut": has_out, "package": False, "publish": False, "review": False},
                "currentStage": "package" if has_out else "cut",
                "currentLabel": "已出片 · 待打包" if has_out else "剪辑中",
                "nextLabel": "去选标题 & 封面 ›" if has_out else "接着剪 ›",
                "nextHash": "#pub-pack" if has_out else "#cut",
                "meta": f"EP{r['episode']} · {r['status']}",
            })

        # 3. 选题池 / 写稿中 / 定稿待剪
        for r in conn.execute("SELECT * FROM topics WHERE trash=0 ORDER BY updated_at DESC LIMIT 12").fetchall():
            t = str(r["title"] or "").strip()
            if not t or _norm(t) in seen_titles:
                continue
            seen_titles.add(_norm(t))
            has_body = len(str(r["body"] or "").strip()) >= 80
            is_final = bool(r["final_at"])
            if is_final:
                cur_stage, cur_label, next_label, next_hash = "cut", "已定稿 · 待拍/待剪", "带标题进剪辑台 ›", "#cut"
            elif has_body:
                cur_stage, cur_label, next_label, next_hash = "script", "草稿已写 · 待审稿定稿", "去写稿 / 审稿 ›", f"#write/{r['id']}"
            else:
                cur_stage, cur_label, next_label, next_hash = "topic", "选题池 · 待扩写口播稿", "AI 扩写初稿 ›", f"#write/{r['id']}"
            items.append({
                "id": f"topic:{r['id']}",
                "kind": "topic",
                "topicId": r["id"],
                "title": t,
                "stages": {"topic": True, "script": is_final, "cut": False, "package": False, "publish": False, "review": False},
                "currentStage": cur_stage,
                "currentLabel": cur_label,
                "nextLabel": next_label,
                "nextHash": next_hash,
                "meta": r["source_ref"] or "选题池",
            })

        return items[:16]

    @app.get("/api/lifecycle")
    def api_lifecycle() -> dict[str, Any]:
        return {"items": _build_lifecycle(config.load_config())}

    @app.get("/api/deps")
    def api_deps() -> dict[str, Any]:
        return deps.check_all_deps()

    @app.post("/api/deps/install")
    def api_deps_install(req: DepsInstallReq | None = None) -> dict[str, Any]:
        targets = req.targets if req else None

        def run_install(log_fn) -> dict[str, Any]:
            return deps.install_deps(targets, log=log_fn)

        job = cutter.JOBS.start("install_deps", "一键安装本地依赖", run_install)
        return {"ok": True, "job": job}

    @app.get("/api/media/stream")
    def api_media_stream(path: str) -> FileResponse:
        """安全流式读取本机视频/封面预览（严格限定在 projectRoot / ~/.park-studio/projects 或当前绑定的媒体文件内）。"""
        raw = (path or "").strip()
        if not raw:
            raise HTTPException(400, "path 不能为空")
        target = Path(raw).expanduser().resolve()
        if not target.is_file():
            raise HTTPException(404, "媒体文件不存在")
        cfg = config.load_config()
        allowed_roots = [
            projects.project_root(cfg).resolve(),
            config.projects_dir().resolve(),
        ]
        allowed_exact: set[Path] = set()
        for r in conn.execute("SELECT source_file FROM cut_projects WHERE source_file != ''").fetchall():
            try:
                allowed_exact.add(Path(r["source_file"]).expanduser().resolve())
            except Exception:
                pass
        for r in conn.execute("SELECT video_path, cover_v_path, cover_h_path FROM publish_episodes").fetchall():
            for col in ("video_path", "cover_v_path", "cover_h_path"):
                if r[col]:
                    try:
                        allowed_exact.add(Path(r[col]).expanduser().resolve())
                    except Exception:
                        pass
        ok_root = any(root in target.parents or target == root for root in allowed_roots)
        if not ok_root and target not in allowed_exact:
            raise HTTPException(403, "只允许预览当前工程目录或已绑定的视频与封面文件")
        return FileResponse(target)

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

    @app.post("/api/benchmarks/from-url")
    def api_benchmark_from_url(req: BenchmarkUrlReq) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            fetched = benchmarks.fetch_url_transcript(req.url, cfg=cfg)
            res = benchmarks.ai_teardown_benchmark(
                conn,
                title=fetched["title"],
                author=fetched["author"],
                url=fetched["url"],
                transcript=fetched["transcript"],
                positioning_text=_positioning_text(),
                mode=req.mode,
                modules=req.modules,
                custom_prompt=req.custom_prompt,
                cfg=cfg,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except (RuntimeError, ai.AIError) as exc:
            raise HTTPException(502, str(exc)) from exc
        return {**res, "fetched": fetched, "benchmarks": benchmarks.list_benchmarks(conn, cfg=cfg)}

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
                tr_txt = "\n".join(str(x.get("text") or "") for x in (plan_data.get("lines") or []) if x.get("i") not in set(drop))
                c2 = db.connect(db_file)
                try:
                    landed = cutter.land_into_publish_project(c2, title=row["title"], rendered_mp4=tmp_out, transcript_text=tr_txt, cfg=cfg, log=log_fn)
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

        # 高级动效模式：导出 worktable.json 到标准工程目录，若已授权则真执行剪辑 Agent 产出 MP4 + 自动落盘
        wt = export_worktable(cut_id)
        allow_exec = bool(cfg.get("cutAgentAllowExec"))

        def run_motion_agent(log_fn) -> dict[str, Any]:
            wt_path = wt["path"]
            ep_dir = projects.scaffold_episode_dir(row["title"] or f"EP{row['episode']}", cfg=cfg)
            upload_dir = ep_dir / "final" / "上传"
            upload_dir.mkdir(parents=True, exist_ok=True)
            analysis_wt = ep_dir / "analysis" / "worktable.json"
            analysis_wt.parent.mkdir(parents=True, exist_ok=True)
            analysis_wt.write_text(json.dumps(wt["payload"], ensure_ascii=False, indent=2), encoding="utf-8")

            log_fn(f"已导出标准镜头表：{analysis_wt}")
            cut_backend = str(cfg.get("cutAgentBackend") or "inherit")

            if allow_exec:
                log_fn(f"已获得本地执行授权，正在拉起剪辑 Agent（{cut_backend}）在工程目录中真正执行剪辑与动效渲染…")
                target_mp4 = upload_dir / "视频（全平台）.mp4"
                prompt = (
                    f"你是全能视频剪辑与动效 Agent。请直接在当前工作目录（{ep_dir}）中完成这期视频的实际剪辑与渲染：\n"
                    f"1. 原片路径：{vp}\n"
                    f"2. 标准镜头表与 Hook 方案：{analysis_wt}（请先读取该 JSON）\n"
                    f"3. 是否烧录字幕：{burn_subs}\n"
                    f"4. 请使用本机 ffmpeg / Python / Remotion 等工具真正执行剪辑、去停顿、按镜头表叠加大字动效/数据卡/转场、统一响度 -16 LUFS 并加上 -movflags +faststart；\n"
                    f"5. 最终成片必须直接输出为：{target_mp4}\n"
                    f"6. 顺手从成片中生成 3 张高转化封面 PNG 放到 `final/上传/`（竖封面/横封面/16比9封面，若时间紧可先保证成片落盘）。\n"
                    "完成后汇报输出文件路径、时长与执行摘要。"
                )
                res = ai.run_agent_execute(prompt, cwd=ep_dir, cfg=cfg, timeout=360)
                log_fn(f"剪辑 Agent 执行完毕（{res['backend']}/{res['model']}），正在扫描 final/上传/ 成片…")
                mp4s = sorted(upload_dir.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
                out_payload: dict[str, Any] = {
                    "worktablePath": str(analysis_wt),
                    "agentReply": res["text"],
                    "backend": res["backend"],
                    "model": res["model"],
                    "executed": True,
                    "folder": str(ep_dir),
                }
                if mp4s:
                    c2 = db.connect(db_file)
                    try:
                        imp = publisher.import_from_project_dir(c2, str(ep_dir), cfg=cfg)
                        c2.execute("UPDATE cut_projects SET status='done', updated_at=? WHERE id=?", (db.now_iso(), cut_id))
                        c2.commit()
                        _save_cut_meta(c2, cut_id, {"outputPath": str(mp4s[0]), "publishFolder": str(ep_dir)})
                        out_payload["videoPath"] = str(mp4s[0])
                        out_payload["publishEpisode"] = imp["episode"]
                        log_fn(f"✓ 检测到新渲染成片：{mp4s[0].name}，已自动导入发布工作台！")
                    finally:
                        c2.close()
                else:
                    log_fn("提示：Agent 已完成回复，但未在 final/上传/ 检测到新 .mp4（可在下方查看执行回执或改用一键粗剪）。")
                return out_payload

            log_fn(f"未开启本地执行授权，正在以只读规划模式调用剪辑 Agent（{cut_backend}）…")
            prompt = (
                f"请读取 {wt_path} 中的 Hook 与镜头表（Spec Table），原片路径为 {vp}，"
                f"字幕烧录={burn_subs}。请输出剪辑执行计划与下一步命令（成片请输出到统一工程目录 final/上传/）。"
            )
            res = ai.run_cut_prompt(prompt, cfg=cfg, timeout=180)
            log_fn(f"剪辑规划完成（{res['backend']}/{res['model']}）。如需让 Agent 直接动手剪出成片，请在「系统 → 独立剪辑 Agent」开启本地执行授权。")
            return {"worktablePath": wt_path, "agentReply": res["text"], "backend": res["backend"], "model": res["model"], "executed": False}

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

    @app.post("/api/cut/{cut_id}/translate-srt")
    def api_cut_translate_srt(cut_id: int, req: TranslateSrtReq | None = None) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM cut_projects WHERE id=?", (cut_id,)).fetchone()
        if not row:
            raise HTTPException(404, "剪辑工程不存在")
        cfg = config.load_config()
        cut = _full_cut(cut_id)
        target_lang = (req.target_lang if req else "en") or "en"
        bilingual = bool(req.bilingual) if req else False
        ep_dir = config.projects_dir() / f"EP{cut['episode']}" / "subtitles"
        fname = f"{target_lang}{'_bilingual' if bilingual else ''}.srt"
        try:
            res = cutter.translate_srt(
                cut.get("lines") or [],
                ep_dir / fname,
                target_lang=target_lang,
                bilingual=bilingual,
                cfg=cfg,
            )
        except (cutter.CutError, ai.AIError) as exc:
            raise HTTPException(502, str(exc)) from exc
        _save_cut_meta(conn, cut_id, {"enSrtPath": res["path"]})
        db.log_event(conn, f"EP{cut['episode']}", f"{res['backend']}/{res['model']}", "生成英文/双语字幕", res["path"])
        return {**res, "cutProject": _full_cut(cut_id)}

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
        if req.cutAgentBackend:
            patch["cutAgentBackend"] = req.cutAgentBackend
        if req.cutAgentAllowExec is not None:
            patch["cutAgentAllowExec"] = bool(req.cutAgentAllowExec)
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

    @app.post("/api/ai/draft")
    def ai_draft(req: AIRequest) -> dict[str, Any]:
        if not req.title.strip():
            raise HTTPException(400, "先填写选题标题再扩写初稿")
        prompt = (
            f"{_positioning_text()}\n\n"
            f"创作者真实原话库（绝不编造虚假案例）：\n{_said_text()}\n\n"
            f"选题标题：{req.title}\n已有零散想法/大纲：\n{req.body[:1500] or '无，请直接按标题起草'}\n\n"
            "请写一篇 700–1100 字的短视频口播初稿，要求：\n"
            "1. 前 3 秒直接抛强反差结论或痛点，绝不寒暄；\n"
            "2. 像真人在镜头前聊天，短句为主，逻辑推进清晰（痛点 → 核心观点 → 2-3 个具体拆解/实操步骤 → 结尾行动号召）；\n"
            "3. 需要创作者补自己真实数字/截图的地方用【待填：...】标出。\n"
            "直接输出完整口播正文，不要加额外客套话。"
        )
        try:
            res = ai.run_prompt(prompt)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        body_txt = res["text"].strip()
        if req.topic_id and body_txt:
            conn.execute("UPDATE topics SET body=?, stage='写', updated_at=? WHERE id=?", (body_txt, db.now_iso(), req.topic_id))
            conn.commit()
        db.log_event(conn, "AI", f"{res['backend']}/{res['model']}", "一键扩写口播初稿", f"{len(body_txt)} 字")
        return {"body": body_txt, "backend": res["backend"], "model": res["model"]}

    @app.post("/api/review/next-topics")
    def api_review_next_topics(req: ReviewNextTopicsReq) -> dict[str, Any]:
        if not req.title.strip():
            raise HTTPException(400, "作品标题不能为空")
        prompt = (
            f"{_positioning_text()}\n\n"
            f"这条已发作品跑出了好成绩：\n"
            f"- 标题：{req.title}\n- 平台：{req.platform}\n- 实测播放：{req.views}\n- 平时倍数：{req.multiple}×\n\n"
            "请复盘它为什么打中观众，并立刻反推出 3 个最值得连拍的下一期续集/衍生选题（换角度深挖或打反面痛点，绝不重复旧内容）。\n"
            '严格只返回一个 JSON 数组（3 项），每项格式：{"title":"吸引点击的短视频标题","angle":"切入角度与为什么接得住上期流量(<=50字)","hook":"前5秒可直接开口念的开头句(<=80字)"}'
        )
        try:
            res = ai.run_prompt(prompt)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        parsed = ai.extract_json_block(res["text"])
        items: list[dict[str, str]] = []
        if isinstance(parsed, list):
            for x in parsed[:3]:
                if isinstance(x, dict) and str(x.get("title") or "").strip():
                    items.append({
                        "title": str(x.get("title") or "").strip(),
                        "angle": str(x.get("angle") or "").strip(),
                        "hook": str(x.get("hook") or "").strip(),
                    })
        if not items:
            raise HTTPException(502, "AI 未能返回结构化续集选题，请重试")
        db.log_event(conn, "复盘", f"{res['backend']}/{res['model']}", "爆款反推续集选题", f"产出 {len(items)} 个")
        return {"ok": True, "topics": items, "backend": res["backend"], "model": res["model"]}

    @app.post("/api/review/weekly-ai")
    def api_review_weekly_ai() -> dict[str, Any]:
        an = metrics.build_analytics(conn)
        wb = an.get("weeklyBrief") or {}
        dy = an.get("douyin") or {}
        if not an.get("hasLiveWorks"):
            raise HTTPException(400, "尚未采集真实作品数据，请先点击「立即采流量」后再做 AI 周报解读")
        snapshot = {
            "headline": wb.get("headline", ""),
            "kpis": wb.get("kpis", []),
            "douyin_retention": {
                "median2sStayPct": dy.get("median2sStayPct"),
                "median2sBouncePct": dy.get("median2sBouncePct"),
                "median5sPct": dy.get("median5sPct"),
                "medianCompletionPct": dy.get("medianCompletionPct"),
                "medianAvgViewS": dy.get("medianAvgViewS"),
                "medianCoverCtrPct": dy.get("medianCoverCtrPct"),
                "totalFansGained": dy.get("totalFansGained"),
            },
            "platformHealth": (wb.get("platformHealth") or [])[:6],
            "winners": wb.get("winners") or [],
            "watchouts": wb.get("watchouts") or [],
        }
        prompt = (
            f"{_positioning_text()}\n\n"
            f"下面是创作者当前全平台真实采集到的运营复盘数据（JSON）：\n{json.dumps(snapshot, ensure_ascii=False)}\n\n"
            "请以「资深内容增长操盘手」的口吻，给出直击要害的周度经营诊断（绝不空话套话，必须引用具体数字与作品名）：\n"
            '严格只返回一个 JSON 对象：{"summary":"2句话总评发生了什么(<=110字)","working":"什么打法正在奏效(<=100字)","leak":"当前最大的流量/留存漏水点在哪(<=100字)","nextMoves":["下周最该执行的第1件事","第2件事","第3件事"]}'
        )
        try:
            res = ai.run_prompt(prompt)
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        parsed = ai.extract_json_block(res["text"])
        if not isinstance(parsed, dict) or not parsed.get("summary"):
            parsed = {
                "summary": str(res["text"]).strip()[:300],
                "working": "",
                "leak": "",
                "nextMoves": [],
            }
        memo = {
            "generatedAt": metrics.datetime.now(metrics.CN).strftime("%Y-%m-%d %H:%M"),
            "backend": res["backend"],
            "model": res["model"],
            "summary": str(parsed.get("summary") or "").strip(),
            "working": str(parsed.get("working") or "").strip(),
            "leak": str(parsed.get("leak") or "").strip(),
            "nextMoves": [str(x).strip() for x in (parsed.get("nextMoves") or []) if str(x).strip()][:4],
        }
        conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('weekly_ai_memo', ?)", (json.dumps(memo, ensure_ascii=False),))
        conn.commit()
        db.log_event(conn, "复盘", f"{res['backend']}/{res['model']}", "AI 深度周报解读", memo["summary"][:40])
        return {"ok": True, "memo": memo}

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
        if not req.name.strip():
            raise HTTPException(400, "客户姓名不能为空")
        ts = db.now_iso()
        cur = conn.execute(
            "INSERT INTO clients(name, niche, stage, amount, source, next_step, note, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (req.name.strip(), req.niche, req.stage or "新线索", int(req.amount or 0), req.source, req.next_step or "待沟通", req.note, ts),
        )
        conn.commit()
        db.log_event(conn, "咨询", "CRM", "新增客户", req.name.strip()[:24])
        return {
            "id": cur.lastrowid,
            "name": req.name.strip(),
            "niche": req.niche,
            "stage": req.stage or "新线索",
            "amount": int(req.amount or 0),
            "source": req.source,
            "next": req.next_step or "待沟通",
            "note": req.note,
        }

    @app.patch("/api/clients/{client_id}")
    def update_client(client_id: int, req: ClientUpdate) -> dict[str, Any]:
        row = conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
        if not row:
            raise HTTPException(404, "客户不存在")
        name = req.name.strip() if req.name is not None else row["name"]
        niche = req.niche if req.niche is not None else row["niche"]
        stage = req.stage if req.stage is not None else row["stage"]
        amount = int(req.amount) if req.amount is not None else int(row["amount"] or 0)
        source = req.source if req.source is not None else row["source"]
        next_step = req.next_step if req.next_step is not None else row["next_step"]
        note = req.note if req.note is not None else row["note"]
        conn.execute(
            "UPDATE clients SET name=?, niche=?, stage=?, amount=?, source=?, next_step=?, note=? WHERE id=?",
            (name, niche, stage, amount, source, next_step, note, client_id),
        )
        conn.commit()
        return {"id": client_id, "name": name, "niche": niche, "stage": stage, "amount": amount, "source": source, "next": next_step, "note": note}

    @app.delete("/api/clients/{client_id}")
    def delete_client(client_id: int) -> dict[str, Any]:
        cur = conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "客户不存在")
        return {"ok": True, "id": client_id}

    @app.post("/api/site/test")
    def api_site_test(req: SiteTestReq | None = None) -> dict[str, Any]:
        import httpx

        cfg = config.load_config()
        base_url = (req.siteUrl if req and req.siteUrl else str(cfg.get("siteUrl") or "")).strip().rstrip("/")
        dash_api = (req.siteDashApi if req and req.siteDashApi else str(cfg.get("siteDashApi") or "/api/admin/dashboard")).strip()
        if not base_url or not base_url.startswith(("http://", "https://")):
            raise HTTPException(400, "请先填写有效的个人网站地址（以 https:// 或 http:// 开头）")
        target = base_url + (dash_api if dash_api.startswith("/") else "/" + dash_api)
        try:
            resp = httpx.get(target, timeout=6.0, follow_redirects=True)
            data = None
            if "application/json" in (resp.headers.get("content-type") or "").lower():
                try:
                    data = resp.json()
                except Exception:
                    data = None
            ok = 200 <= resp.status_code < 400
            return {
                "ok": ok,
                "url": target,
                "statusCode": resp.status_code,
                "hasJson": isinstance(data, (dict, list)),
                "channels": data.get("channels", []) if isinstance(data, dict) and isinstance(data.get("channels"), list) else [],
                "error": "" if ok else f"站点返回 HTTP {resp.status_code}，请确认只读接口路径与权限配置",
            }
        except Exception as exc:
            raise HTTPException(502, f"无法连接个人网站（{target}）：{exc}") from exc

    @app.post("/api/chrome/cookies/export")
    async def api_chrome_cookies_export(req: CookiesPathReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        raw = (req.path if req and req.path else "").strip() or str(config.data_dir() / "cookies-export.json")
        try:
            res = await cdp.export_cookies(Path(raw), cfg=cfg)
        except Exception as exc:
            raise HTTPException(502, f"导出 Cookies 失败：{exc}") from exc
        db.log_event(conn, "系统", "Chrome", "导出 Cookies", f"{res['count']} 条 -> {res['path']}")
        return {**res, "daemonLogs": _recent_logs()}

    @app.post("/api/chrome/cookies/import")
    async def api_chrome_cookies_import(req: CookiesPathReq) -> dict[str, Any]:
        cfg = config.load_config()
        raw = (req.path or "").strip()
        if not raw:
            raise HTTPException(400, "请填写旧电脑导出的 Cookie JSON 文件路径")
        try:
            res = await cdp.import_cookies(Path(raw), cfg=cfg)
        except (FileNotFoundError, ValueError) as exc:
            raise HTTPException(400, str(exc)) from exc
        except Exception as exc:
            raise HTTPException(502, f"导入 Cookies 失败：{exc}") from exc
        db.log_event(conn, "系统", "Chrome", "导入 Cookies", f"已注入 {res['imported']} 条")
        return {**res, "chromeStatus": cdp.chrome_status(cfg), "daemonLogs": _recent_logs()}

    @app.post("/api/review/episodes/merge")
    def api_review_episodes_merge(req: EpisodeMergeReq) -> dict[str, Any]:
        try:
            res = metrics.merge_episode_works(conn, req.work_keys)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {**res, "analytics": metrics.build_analytics(conn), "daemonLogs": _recent_logs()}

    @app.post("/api/review/episodes/split")
    def api_review_episodes_split(req: EpisodeSplitReq) -> dict[str, Any]:
        try:
            res = metrics.split_episode_work(conn, req.work_key)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {**res, "analytics": metrics.build_analytics(conn), "daemonLogs": _recent_logs()}

    @app.post("/api/review/episodes/reset-overrides")
    def api_review_episodes_reset() -> dict[str, Any]:
        res = metrics.reset_episode_merges(conn)
        return {**res, "analytics": metrics.build_analytics(conn), "daemonLogs": _recent_logs()}

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

    @app.post("/api/publish/{episode_id}/localize")
    def api_publish_localize(episode_id: int, req: LocalizePublishReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        try:
            res = publisher.localize_episode_copy(
                conn,
                episode_id,
                target_platforms=req.platforms if req else None,
                lang_overrides=req.lang_overrides if req else None,
                cfg=cfg,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        return {**res, "episodes": publisher.list_episodes(conn), "daemonLogs": _recent_logs()}

    @app.post("/api/publish/{episode_id}/titles")
    def api_publish_titles(episode_id: int, req: GenerateTitlesReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        r = req or GenerateTitlesReq()
        try:
            res = publisher.generate_title_candidates(conn, episode_id, transcript=r.transcript, angle=r.angle, cfg=cfg)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except ai.AIError as exc:
            raise HTTPException(502, str(exc)) from exc
        return {**res, "episodes": publisher.list_episodes(conn), "lifecycle": _build_lifecycle(cfg), "daemonLogs": _recent_logs()}

    @app.post("/api/publish/{episode_id}/pick-title")
    def api_publish_pick_title(episode_id: int, req: PickTitleReq) -> dict[str, Any]:
        try:
            res = publisher.pick_title_candidate(conn, episode_id, index=req.index, title=req.title, cover_text=req.cover_text)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {**res, "episodes": publisher.list_episodes(conn), "lifecycle": _build_lifecycle(config.load_config()), "daemonLogs": _recent_logs()}

    @app.post("/api/autopilot/from-video")
    def api_autopilot_from_video(req: AutopilotVideoReq) -> dict[str, Any]:
        """「上来就拍 · 一键全自动（Autopilot）」：选一条原片 → 转写 → 删口误挑 Hook → -16 LUFS 粗剪 → 6 动机标题 → 3 比例封面 → 多平台中英文案。"""
        vp = Path((req.video_path or "").strip()).expanduser()
        if not str(req.video_path or "").strip() or not vp.is_file():
            raise HTTPException(400, f"找不到本地原片文件：{req.video_path or '请先选择视频'}")
        cfg = config.load_config()
        ep_title = (req.title or "").strip() or vp.stem

        def run_autopilot(log_fn) -> dict[str, Any]:
            log_fn(f"1/5 本机离线转写原片并分析口误与停顿：{vp.name} …")
            plan_data = cutter.transcribe_video(vp, cfg=cfg, log=log_fn)
            lines = plan_data.get("lines") or []
            drop = list(plan_data.get("drop") or [])
            kept = [ln for ln in lines if ln["i"] not in set(drop)] or lines
            hooks: list[int] = []
            try:
                log_fn("2/5 调用 AI 从口播原话中挑出最抓人的开头 Hook…")
                planned = cutter.ai_plan_shots(plan_data, title=ep_title, density="低", cfg=cfg, positioning_text=_positioning_text())
                hooks = planned.get("hooks") or []
            except Exception as exc:
                log_fn(f"AI 挑 Hook 跳过（{exc}），自动使用首句有效原话")
            if not hooks and kept:
                hooks = [int(kept[0]["i"])]

            log_fn("3/5 正在渲染 -16 LUFS 响度统一 + 字幕成片并落盘到统一工程目录…")
            tmp_out = config.projects_dir() / "autopilot_latest.mp4"
            r_res = cutter.render_rough_cut(vp, plan_data, tmp_out, drop=drop, hooks=hooks, burn_subs=req.burn_subs, log=log_fn)
            tr_txt = "\n".join(str(x.get("text") or "") for x in kept)

            c2 = db.connect(db_file)
            try:
                landed = cutter.land_into_publish_project(c2, title=ep_title, rendered_mp4=tmp_out, transcript_text=tr_txt, cfg=cfg, log=log_fn)
                ep = landed["publishEpisode"]
                ep_id = ep["id"]

                titles_res = None
                try:
                    log_fn("4/5 根据口播逐字稿生成 6 个不同动机的备选标题与封面大字…")
                    titles_res = publisher.generate_title_candidates(c2, ep_id, transcript=tr_txt, cfg=cfg)
                    if titles_res.get("candidates"):
                        top0 = titles_res["candidates"][0]
                        picked = publisher.pick_title_candidate(c2, ep_id, index=0, title=top0["title"], cover_text=top0["cover_text"])
                        ep = picked["episode"]
                        log_fn(f"已自动先套用第 1 个推荐标题（{top0['motive']}）：{top0['title']}")
                except Exception as exc:
                    log_fn(f"6 标题生成跳过（{exc}），可在打包页手动重试")

                cov_res = None
                if req.generate_covers:
                    try:
                        log_fn("5/5 自动抽帧生成 3 比例封面（9:16 / 4:3 / 16:9）并适配多平台中英文案…")
                        cov_head = (ep.get("publishJson") or {}).get("cover_headline") or ep["title"]
                        cov_res = covers.generate_episode_covers(c2, ep_id, mode="local", headline=cov_head, cfg=cfg)
                        ep = cov_res["episode"]
                    except Exception as exc:
                        log_fn(f"自动出封面跳过（{exc}）")

                loc_res = None
                if req.localize_copy:
                    try:
                        loc_res = publisher.localize_episode_copy(c2, ep_id, cfg=cfg)
                        ep = loc_res["episode"]
                        log_fn(f"✓ 已为 {loc_res['localized']} 个启用平台生成专属中/英文案与 Hashtags！")
                    except Exception as exc:
                        log_fn(f"多平台文案适配跳过（{exc}）")

                db.log_event(c2, f"EP{ep['episode']}", "Autopilot", "原片一条龙全自动完成", f"{r_res['durationText']} · 6 标题 + 3 封面")
                return {
                    "ok": True,
                    "episode": ep,
                    "episodeId": ep_id,
                    "videoPath": landed["videoPath"],
                    "folder": landed["folder"],
                    "titlesCount": len((titles_res or {}).get("candidates") or []),
                    "hasCovers": bool(cov_res),
                    "localizedCount": (loc_res or {}).get("localized", 0),
                }
            finally:
                c2.close()

        job = cutter.JOBS.start("autopilot", f"一键全自动出片 · {ep_title[:20]}", run_autopilot)
        return {"ok": True, "job": job}

    @app.post("/api/publish/{episode_id}/generate-covers")
    def api_publish_generate_covers(episode_id: int, req: CoverGenReq | None = None) -> dict[str, Any]:
        cfg = config.load_config()
        r = req or CoverGenReq()
        try:
            res = covers.generate_episode_covers(
                conn,
                episode_id,
                mode=r.mode or "local",
                headline=r.headline,
                subtitle=r.subtitle,
                style_hint=r.style_hint,
                frame_ratio=r.frame_ratio,
                cfg=cfg,
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        except (RuntimeError, ai.AIError) as exc:
            raise HTTPException(502, str(exc)) from exc
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
