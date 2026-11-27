"""Step 5 (v0.5.0) 自动化测试：
- 6 个不同动机备选标题生成（反差感/真实冲突/硬数字/场景后果/悬念缺口/硬结果）与采用联动封面大字
- 内容全生命周期总览（/api/lifecycle 与 /api/bootstrap）
- 海外 5 平台（Instagram / Threads / LinkedIn / Meta / TikTok）采集器注册
- 上来就拍一键全自动 Autopilot（参数校验 + 端到端 Mock 跑通）
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from fastapi.testclient import TestClient

from park_studio import ai, app as app_mod, config, covers, cutter, metrics, publisher


def test_v050_six_motivation_titles_and_pick(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})

    def fake_run_prompt(prompt: str, **kwargs):
        cands = [
            {"motive": m, "title": f"{m}测试标题：一个人跑通12平台", "reason": f"靠{m}拉住停留", "cover_text": f"{m}封面大字"}
            for m in publisher.TITLE_MOTIVES
        ]
        return {
            "text": json.dumps({"candidates": cands, "description": "全自动口播简介测试", "tags": ["AI工作流", "一人公司"]}, ensure_ascii=False),
            "backend": "gemini-api",
            "model": "gemini-2.5-flash",
        }

    monkeypatch.setattr(ai, "run_prompt", fake_run_prompt)

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    ep_id = client.get("/api/publish/episodes").json()["episodes"][0]["id"]

    res = client.post(f"/api/publish/{ep_id}/titles", json={"transcript": "今天聊聊怎么用本地工具把12平台运营成本压到最低。"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["candidates"]) == 6
    assert [c["motive"] for c in data["candidates"]] == publisher.TITLE_MOTIVES

    # 采用第 3 个（硬数字）标题，应同步更新主标题与封面大字
    picked = client.post(f"/api/publish/{ep_id}/pick-title", json={"index": 2})
    assert picked.status_code == 200
    pd = picked.json()
    assert pd["title"].startswith("硬数字测试标题")
    assert pd["coverHeadline"] == "硬数字封面大字"
    assert pd["episode"]["publishJson"]["picked_title_idx"] == 2


def test_v050_lifecycle_pipeline_and_overseas_collectors(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 1. 全生命周期总览返回 6 阶段进度和下一步路由
    lc = client.get("/api/lifecycle").json()["items"]
    assert len(lc) >= 2
    for it in lc:
        assert set(it["stages"].keys()) == {"topic", "script", "cut", "package", "publish", "review"}
        assert it["nextHash"].startswith("#")
        assert it["nextLabel"]

    # 2. 海外 5 家采集器全部已注册进 metrics.COLLECTORS
    for pid in ("instagram", "threads", "linkedin", "meta", "tiktok"):
        assert pid in metrics.COLLECTORS


def test_v050_autopilot_from_video_end_to_end(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    proj_root = tmp_path / "exports"
    config.save_config({"obsidianPath": str(tmp_path / "empty"), "projectRoot": str(proj_root)})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 缺文件应返回 400
    assert client.post("/api/autopilot/from-video", json={"video_path": str(tmp_path / "missing.mp4")}).status_code == 400

    raw_mp4 = tmp_path / "raw_talk.mp4"
    raw_mp4.write_bytes(b"ftypmp42moov0000mdat0000")

    monkeypatch.setattr(
        cutter,
        "transcribe_video",
        lambda vp, cfg=None, log=None: {
            "sentences": [{"id": 0, "start": 0.0, "end": 3.0, "text": "其实你根本不需要每天花两小时发视频"}],
            "lines": [{"i": 0, "ts": "00:00", "start": 0.0, "end": 3.0, "text": "其实你根本不需要每天花两小时发视频"}],
            "drop": [],
        },
    )
    monkeypatch.setattr(cutter, "ai_plan_shots", lambda *a, **kw: {"hooks": [0], "shots": []})
    monkeypatch.setattr(
        cutter,
        "render_rough_cut",
        lambda vp, plan, out_path, **kw: (
            out_path.parent.mkdir(parents=True, exist_ok=True),
            out_path.write_bytes(b"ftypmp42moov0000mdat0000"),
            {"file": str(out_path), "durationText": "3.0 秒", "sizeMb": 0.1},
        )[-1],
    )
    monkeypatch.setattr(
        covers,
        "generate_episode_covers",
        lambda conn, ep_id, **kw: {"ok": True, "covers": {"cover_v": "", "cover_h": "", "cover_169": ""}, "episode": publisher.get_episode(conn, ep_id)},
    )
    monkeypatch.setattr(
        ai,
        "run_prompt",
        lambda prompt, **kw: {
            "text": json.dumps(
                {
                    "candidates": [{"motive": m, "title": f"{m}自动标题", "reason": "理由", "cover_text": f"{m}大字"} for m in publisher.TITLE_MOTIVES],
                    "description": "自动简介",
                    "tags": ["AI"],
                    "douyin": {"lang": "zh", "title": "抖音自动标题", "description": "抖音正文", "tags": ["AI"]},
                    "youtube": {"lang": "en", "title": "Auto YouTube Title", "description": "Auto EN desc", "tags": ["AI"]},
                },
                ensure_ascii=False,
            ),
            "backend": "gemini-api",
            "model": "gemini-2.5-flash",
        },
    )

    resp = client.post("/api/autopilot/from-video", json={"video_path": str(raw_mp4), "title": "上来就拍测试"})
    assert resp.status_code == 200
    jid = resp.json()["job"]["id"]
    for _ in range(40):
        st = client.get(f"/api/cut/jobs/{jid}").json()
        if st["state"] != "running":
            break
        time.sleep(0.1)
    assert st["state"] == "done"
    assert st["result"]["titlesCount"] == 6
    assert st["result"]["hasCovers"] is True
    assert st["result"]["localizedCount"] >= 2


def test_v051_platform_strategy_defaults_and_english_visual_card(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    proj_root = tmp_path / "exports"
    cfg = config.save_config({"obsidianPath": str(tmp_path / "empty"), "projectRoot": str(proj_root)})

    # 校验默认矩阵：YouTube 发中文视频；IG/Meta 发英文图文；LinkedIn/X/Threads 发英文纯文字（均不传中文视频）
    assert publisher.platform_strategy_for("youtube", cfg) == {"lang": "zh", "format": "video"}
    assert publisher.platform_strategy_for("instagram", cfg) == {"lang": "en", "format": "image_text"}
    assert publisher.platform_strategy_for("meta", cfg) == {"lang": "en", "format": "image_text"}
    assert publisher.platform_strategy_for("linkedin", cfg) == {"lang": "en", "format": "text"}

    monkeypatch.setattr(
        ai,
        "run_prompt",
        lambda prompt, **kw: {
            "text": json.dumps(
                {
                    "youtube": {"lang": "zh", "format": "video", "title": "我用本地开源中控跑通12平台", "description": "中文视频简介", "tags": ["AI工作流"]},
                    "instagram": {
                        "lang": "en", "format": "image_text",
                        "title": "Why Solo Builders Are Leaving SaaS",
                        "description": "3 lessons from shipping a local Creator OS.",
                        "tags": ["SoloFounder", "BuildInPublic"],
                        "card_headline": "Why Solo Builders Leave SaaS",
                        "card_bullets": ["Zero monthly API tax", "100% local SQLite & FFmpeg", "12 platforms from one hub"],
                    },
                    "linkedin": {
                        "lang": "en", "format": "text",
                        "title": "Running 12 content platforms solo without SaaS bloat",
                        "description": "Here is the exact local architecture we shipped.",
                        "tags": ["OpenSource", "CreatorEconomy"],
                    },
                },
                ensure_ascii=False,
            ),
            "backend": "gemini-api",
            "model": "gemini-2.5-flash",
        },
    )

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    ep_id = client.get("/api/publish/episodes").json()["episodes"][0]["id"]
    res = client.post(f"/api/publish/{ep_id}/localize", json={"platforms": ["youtube", "instagram", "linkedin"]})
    assert res.status_code == 200
    data = res.json()
    assert data["platforms"]["youtube"]["lang"] == "zh"
    assert data["platforms"]["youtube"]["format"] == "video"
    assert data["platforms"]["instagram"]["lang"] == "en"
    assert data["platforms"]["instagram"]["format"] == "image_text"
    assert data["platforms"]["linkedin"]["format"] == "text"
    if cutter._which("ffmpeg"):
        assert data["enCardPath"] and Path(data["enCardPath"]).is_file()


def test_v052_douyin_retention_and_weekly_brief(tmp_path: Path, monkeypatch) -> None:
    """v0.5.2：抖音 2s留存/5s完播/封面点击/单条涨粉解析 + 跨平台单期拆解 + 可视化结构化周报与 AI 解读。"""
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    raw_json = json.dumps(
        {
            "has_more": False,
            "max_cursor": "0",
            "aweme_list": [
                {
                    "aweme_id": "7690817035621666111",
                    "desc": "AI时代的明牌机会，但是大部分人不会走 #AI",
                    "create_time": 1760000000,
                    "video": {"duration": 520000},
                    "statistics": {"play_count": 120000, "digg_count": 4200, "collect_count": 3800, "comment_count": 310, "share_count": 500},
                },
                {
                    "aweme_id": "7690817035621666222",
                    "desc": "普通日常复盘视频",
                    "create_time": 1759500000,
                    "video": {"duration": 300000},
                    "statistics": {"play_count": 20000, "digg_count": 400, "collect_count": 260, "comment_count": 25, "share_count": 40},
                },
            ],
            "items": [
                {
                    "id": 7690817035621666111,
                    "create_time": 1760000000,
                    "metrics": {
                        "view_count": "120000",
                        "bounce_rate_2s": "0.285",
                        "completion_rate_5s": "0.468",
                        "completion_rate": "0.025",
                        "avg_view_second": "42.3",
                        "cover_click_rate": "0.312",
                        "subscribe_count": "1280",
                        "unsubscribe_count": "20",
                        "homepage_visit_count": "6400",
                    },
                },
                {
                    "id": 7690817035621666222,
                    "create_time": 1759500000,
                    "metrics": {
                        "view_count": "20000",
                        "bounce_rate_2s": "0.482",
                        "completion_rate_5s": "0.310",
                        "completion_rate": "0.012",
                        "avg_view_second": "18.6",
                        "cover_click_rate": "0.184",
                        "subscribe_count": "95",
                        "unsubscribe_count": "5",
                        "homepage_visit_count": "820",
                    },
                },
            ],
        },
        ensure_ascii=False,
    )
    rows, has_more, _ = metrics.parse_douyin_work_list(raw_json)
    assert has_more is False
    assert len(rows) == 2
    assert rows[0]["raw"]["completion_5s"] == 0.468
    assert rows[0]["raw"]["retention_2s"] == 0.715
    assert rows[0]["raw"]["fans_gained"] == 1280

    from park_studio import db
    conn = db.connect(tmp_path / "data" / "studio.db")
    db.init_db(conn)
    metrics.upsert_works(conn, rows + [{
        "platform": "bilibili",
        "work_id": "BV1test12345",
        "title": "AI时代的明牌机会，但是大部分人不会走",
        "url": "https://www.bilibili.com/video/BV1test12345",
        "published_at": "2026-10-10",
        "published_ts": 1760000100,
        "duration_sec": 520,
        "views": 6500,
        "likes": 210,
        "comments": 30,
        "favorites": 180,
        "shares": 22,
        "raw": {},
    }])
    an = metrics.build_analytics(conn)
    assert an["douyin"]["hasRetention"] is True
    assert an["douyin"]["median5sPct"] is not None
    assert an["douyin"]["median2sStayPct"] is not None
    assert an["douyin"]["totalFansGained"] == 1375
    assert len(an["douyin"]["retentionInsights"]) >= 2
    assert an["ageReviews"][0]["platformCount"] == 2
    assert len(an["ageReviews"][0]["platformBreakdown"]) == 2
    wb = an["weeklyBrief"]
    assert wb["headline"] and len(wb["kpis"]) == 5 and len(wb["whatHappened"]) >= 2 and len(wb["nextWeekActions"]) >= 2

    monkeypatch.setattr(
        ai,
        "run_prompt",
        lambda prompt, **kw: {
            "text": json.dumps({
                "summary": "本周代表作《AI时代的明牌机会》拉动全盘增长，单条涨粉 +1,280。",
                "working": "高 5s 完播（46.8%）+ 强封面点击（31.2%）带来推流放大。",
                "leak": "日常复盘视频 2s 跳出 48.2%，开头缺少冲突钩子。",
                "nextMoves": ["围绕代表作做 1 条续集", "前 2 秒直接抛结果画面"],
            }, ensure_ascii=False),
            "backend": "gemini-api",
            "model": "gemini-2.5-flash",
        },
    )
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    r = client.post("/api/review/weekly-ai")
    assert r.status_code == 200
    assert "代表作" in r.json()["memo"]["summary"]
    assert client.get("/api/bootstrap").json()["analytics"]["weeklyBrief"]["aiMemo"]["summary"]


