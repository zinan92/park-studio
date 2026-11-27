"""Step 6 (v0.5.1) 可靠性与零假数据回归测试：
- 彻底清零假数据（无虚构客户、无知识树表数据、前端无 538,780 / 老麦聊AI、Swift 无 ~/work/park-studio/src 硬编码）
- 平台同步状态机（区分 never / unsupported / not_logged_in / error / ok）与精确时间戳
- 跨平台单期手动合并、拆开与恢复自动归并
- 咨询客户完整 CRUD、个人网站连通性接口校验、doctor 自检与 Cookie 导入校验
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from park_studio import app as app_mod, cdp, config, db, metrics, platforms, server


def test_v051_zero_fake_data_and_no_hardcoded_dev_paths(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    boot = client.get("/api/bootstrap").json()
    # 1. 新装零虚构客户，无知识树
    assert boot["clients"] == []
    assert "tree" not in boot
    assert boot["positioning"]["who"] == ""

    # 2. 静态前端与 Swift 壳零假数据、零个人开发路径硬编码
    repo = Path(__file__).resolve().parents[1]
    ops_js = (repo / "src/park_studio/static/js/pages-ops.js").read_text(encoding="utf-8")
    data_js = (repo / "src/park_studio/static/js/data.js").read_text(encoding="utf-8")
    swift_src = (repo / "desktop/macos/ParkStudioApp.swift").read_text(encoding="utf-8")

    assert "538,780" not in ops_js
    assert "老麦聊AI" not in data_js
    assert "周洋帆" not in data_js
    assert "work/park-studio/src" not in swift_src
    assert (repo / "src/park_studio/static/img/previews/hub.png").is_file()
    assert (repo / "src/park_studio/static/img/previews/review.png").is_file()


def test_v051_platform_sync_state_and_capabilities(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    conn = db.connect(tmp_path / "data" / "studio.db")
    db.init_db(conn)

    # 初始状态：douyin 未采集 (never)，x/wechat 作品采集明确标为 unsupported
    pmap = platforms.get_platform_status_map(conn)
    assert pmap["douyin"]["sync"]["works"]["status"] == "never"
    assert pmap["douyin"]["capabilities"]["retention"] is True
    assert pmap["x"]["sync"]["works"]["status"] == "unsupported"
    assert pmap["wechat"]["sync"]["works"]["status"] == "unsupported"

    # 记录一次采集失败与一次成功，确认 lastSuccessAt 保留上次成功时间而 status 正确区分
    db.record_sync_state(conn, "douyin", "works", "ok", count=12, at_str="2026-11-27 10:00:00")
    db.record_sync_state(conn, "douyin", "works", "error", count=0, error_msg="页面 DOM 改版", at_str="2026-11-27 12:30:00")
    pmap2 = platforms.get_platform_status_map(conn)
    ws = pmap2["douyin"]["sync"]["works"]
    assert ws["status"] == "error"
    assert ws["error"] == "页面 DOM 改版"
    assert ws["lastAttemptAt"] == "2026-11-27 12:30:00"
    assert ws["lastSuccessAt"] == "2026-11-27 10:00:00"


def test_v051_manual_episode_merge_split_and_diag_meta(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    db_file = tmp_path / "data" / "studio.db"
    conn = db.connect(db_file)
    db.init_db(conn)

    # 两条标题完全不同的跨平台作品，自动归并会拆成 2 期
    metrics.upsert_works(
        conn,
        [
            {
                "platform": "douyin",
                "work_id": "dy_diff_1",
                "title": "普通人做自媒体最容易忽略的一步",
                "url": "https://www.douyin.com/video/1",
                "published_at": "2026-11-20",
                "published_ts": 1763600000,
                "duration_sec": 240,
                "views": 10000,
                "likes": 300,
                "comments": 20,
                "favorites": 150,
                "shares": 30,
            },
            {
                "platform": "youtube",
                "work_id": "yt_diff_1",
                "title": "Why Solo Creators Burn Out Publishing Manually",
                "url": "https://youtu.be/abc",
                "published_at": "2026-11-20",
                "published_ts": 1763600500,
                "duration_sec": 240,
                "views": 2500,
                "likes": 90,
                "comments": 12,
                "favorites": 0,
                "shares": 15,
            },
        ],
    )
    client = TestClient(app_mod.create_app(db_file))
    an0 = client.get("/api/metrics/overview").json()
    assert an0["totalEpisodes"] == 2
    assert an0["douyin"]["lowSample"] is True
    assert an0["ageReviews"][0]["diagMeta"]["method"] == "规则推断"

    # 手动合并为同一期
    m = client.post("/api/review/episodes/merge", json={"work_keys": ["douyin:dy_diff_1", "youtube:yt_diff_1"]})
    assert m.status_code == 200
    an1 = m.json()["analytics"]
    assert an1["totalEpisodes"] == 1
    assert an1["episodes"][0]["views"] == 12500
    assert an1["episodes"][0]["manualMerged"] is True

    # 手动拆出 youtube
    sp = client.post("/api/review/episodes/split", json={"work_key": "youtube:yt_diff_1"})
    assert sp.status_code == 200
    assert sp.json()["analytics"]["totalEpisodes"] == 2

    # 恢复自动归并
    rs = client.post("/api/review/episodes/reset-overrides")
    assert rs.status_code == 200
    assert rs.json()["analytics"]["hasManualOverrides"] is False


def test_v051_clients_crud_site_validation_and_doctor(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 咨询客户 CRUD
    c1 = client.post("/api/clients", json={"name": "测试客户A", "niche": "独立开发", "amount": 3000}).json()
    assert c1["name"] == "测试客户A"
    u1 = client.patch(f"/api/clients/{c1['id']}", json={"stage": "已成交"}).json()
    assert u1["stage"] == "已成交"
    d1 = client.delete(f"/api/clients/{c1['id']}")
    assert d1.status_code == 200

    # 个人网站空 URL 返回清晰 400
    bad_site = client.post("/api/site/test", json={"siteUrl": ""})
    assert bad_site.status_code == 400

    # Cookie 导入不存在文件返回清晰 400
    bad_ck = client.post("/api/chrome/cookies/import", json={"path": str(tmp_path / "nope.json")})
    assert bad_ck.status_code == 400

    # doctor 自检在当前环境返回 0
    assert server.cmd_doctor(port=19876) == 0
