"""Step 3 自动化测试：MP4 faststart 校验、publish.json 打包导出、发布状态机持久化、提交前截图接口与 launchd 生成。"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from park_studio import app as app_mod, config, daemon, dailies, projects, publisher


def test_mp4_faststart_validator(tmp_path: Path) -> None:
    good_mp4 = tmp_path / "good.mp4"
    good_mp4.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"moov" + b"\x00" * 64 + b"mdat" + b"\x00" * 64)
    r_good = publisher.check_mp4_faststart(good_mp4)
    assert r_good["exists"] is True and r_good["faststart"] is True

    bad_mp4 = tmp_path / "bad.mp4"
    bad_mp4.write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"mdat" + b"\x00" * 64 + b"moov" + b"\x00" * 64)
    r_bad = publisher.check_mp4_faststart(bad_mp4)
    assert r_bad["exists"] is True and r_bad["faststart"] is False

    r_miss = publisher.check_mp4_faststart(tmp_path / "missing.mp4")
    assert r_miss["exists"] is False


def test_publish_pack_mark_screenshot_and_launchd(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    demo_mp4 = tmp_path / "EP42.mp4"
    demo_mp4.write_bytes(b"ftypmp42moov0000mdat0000")

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    eps = client.get("/api/publish/episodes").json()["episodes"]
    assert len(eps) >= 2
    ep42 = next(e for e in eps if e["episode"] == 42)

    # 1. 打包并导出真实 publish.json + faststart 校验
    packed = client.post(
        f"/api/publish/{ep42['id']}/pack",
        json={"video_path": str(demo_mp4), "schedule": "2026-11-25T20:00:00+08:00"},
    )
    assert packed.status_code == 200
    pb = packed.json()
    out_path = Path(pb["path"])
    assert out_path.is_file()
    saved_json = json.loads(out_path.read_text(encoding="utf-8"))
    assert saved_json["episode"] == 42
    assert saved_json["video_path"] == str(demo_mp4)
    assert pb["episode"]["preflight"]["video"]["faststart"] is True

    # 2. 手动标记平台发布状态并落盘
    mk = client.post(
        f"/api/publish/{ep42['id']}/mark",
        json={"platform": "bilibili", "state": "published", "url": "https://www.bilibili.com/video/BV1test"},
    )
    assert mk.status_code == 200
    assert mk.json()["episode"]["tasks"]["bilibili"]["state"] == "published"
    assert mk.json()["episode"]["tasks"]["bilibili"]["url"] == "https://www.bilibili.com/video/BV1test"

    # 3. 截图存档接口
    shot_file = tmp_path / "data" / "projects" / "EP42" / "publish_shots" / "douyin.jpg"
    shot_file.parent.mkdir(parents=True, exist_ok=True)
    shot_file.write_bytes(b"\xff\xd8\xff\xe0FAKEJPEG")
    conn = app_mod.db.connect(tmp_path / "data" / "studio.db")
    conn.execute(
        "UPDATE publish_tasks SET screenshot_path=? WHERE episode_id=? AND platform='douyin'",
        (str(shot_file), ep42["id"]),
    )
    conn.commit()
    img_res = client.get(f"/api/publish/{ep42['id']}/screenshot/douyin")
    assert img_res.status_code == 200
    assert img_res.content.startswith(b"\xff\xd8\xff")

    # 4. launchd plist 模板渲染
    plist = daemon.render_plist(port=8792)
    assert "com.parkstudio.server" in plist
    assert "<string>8792</string>" in plist


def test_universal_project_folder_scaffold_and_import(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    root = tmp_path / "exports"
    cfg = config.save_config({"obsidianPath": str(tmp_path / "empty"), "projectRoot": str(root)})

    # 1. 定稿自动建标准目录结构
    ep_dir = projects.scaffold_episode_dir("测试自动标准包", day="2026-11-23", script_body="口播正文", cfg=cfg)
    assert (ep_dir / "拍摄提纲.md").is_file()
    assert (ep_dir / "final" / "上传").is_dir()
    assert (ep_dir / "subtitles").is_dir()

    # 2. 模拟 AI 把成片、3 张封面、文案.txt 放进 final/上传/
    up = ep_dir / "final" / "上传"
    (up / "视频（抖音、视频号、小红书、B站、YouTube）.mp4").write_bytes(b"ftypmp42moov0000mdat0000")
    (up / "竖封面（抖音、视频号）.png").write_bytes(b"\x89PNG")
    (up / "横封面（抖音、小红书）.png").write_bytes(b"\x89PNG")
    (up / "16比9封面（B站、YouTube）.png").write_bytes(b"\x89PNG")
    (up / "文案.txt").write_text(
        "如果AI有你的手脚，他会比你赚更多吗\n\n话题 · 抖音：#AI工作流 #一人公司\n话题 · 小红书：#效率神器 #Redskill\n",
        encoding="utf-8",
    )

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    scanned = client.get("/api/projects").json()
    assert scanned["mounted"] is True
    assert len(scanned["projects"]) == 1
    p0 = scanned["projects"][0]
    assert p0["stage"] == "ready"
    assert p0["copyData"]["platforms"]["douyin"]["tags"] == ["AI工作流", "一人公司"]

    imp = client.post("/api/publish/from-project", json={"folder": str(ep_dir)}).json()
    assert imp["ok"] is True
    assert imp["episode"]["preflight"]["video"]["faststart"] is True
    assert (up / "publish.json").is_file()


def test_saved_daily_pete_cards_and_dev_daily(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    vroot = tmp_path / "vault"
    pete_dir = vroot / "011_pete"
    saved_dir = vroot / "002_个人收藏"
    pete_dir.mkdir(parents=True)
    saved_dir.mkdir(parents=True)

    (pete_dir / "261118.md").write_text(
        """# Pete 出卡 · 261118

## 一、商业机会卡

### 1.【值得试 · 总分 32】海外独立工具小站

**这条能带来什么：用 AI 做一个轻量垂直 SaaS，30 天验证付费。**

原链接：https://x.com/demo/status/123456789

**结果：** $12,400 月收入 ｜ 3.2 万 浏览

**目标客户：** 独立开发者

**7 天试法：** 先做落地页收预售。
""",
        encoding="utf-8",
    )
    (saved_dir / "261118_X_测试收藏__abc123.md").write_text(
        "---\ntitle: 一篇收藏文章\nurl: https://x.com/other/status/999\n---\n正文内容测试。",
        encoding="utf-8",
    )

    config.save_config({"obsidianPath": str(vroot), "projectRoot": str(tmp_path / "exports")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    sv = client.get("/api/source/saved").json()
    assert sv["day"] == "2026-11-18"
    assert len(sv["cards"]) == 1
    assert sv["cards"][0]["results"][0]["value"] == "$12,400"
    assert len(sv["items"]) == 1

    st = client.post("/api/source/moneycard-state", json={"id": sv["cards"][0]["id"], "state": "wait"}).json()
    assert st["ok"] is True

    dv = client.get("/api/source/dev").json()
    assert len(dv["sections"]) >= 1


def test_metrics_upsert_and_cross_platform_grouping(tmp_path: Path, monkeypatch):
    from park_studio import db, metrics

    monkeypatch.setenv("PARK_STUDIO_DATA_DIR", str(tmp_path / "data"))
    conn = db.connect(tmp_path / "data" / "studio.db")
    db.init_db(conn)

    # 空态不能伪造数据
    empty = metrics.build_analytics(conn)
    assert empty["hasLiveWorks"] is False
    assert empty["episodes"] == []

    metrics.upsert_works(
        conn,
        [
            {
                "platform": "douyin",
                "work_id": "dy1",
                "title": "一条视频涨粉5k，AI时代新手博主的版本答案",
                "url": "https://www.douyin.com/video/dy1",
                "published_at": "2026-10-14",
                "published_ts": 1791900000,
                "duration_sec": 1000,
                "views": 120000,
                "likes": 3000,
                "comments": 80,
                "favorites": 2400,
                "shares": 400,
            },
            {
                "platform": "douyin",
                "work_id": "dy2",
                "title": "普通日常视频测试",
                "url": "https://www.douyin.com/video/dy2",
                "published_at": "2026-10-10",
                "published_ts": 1791550000,
                "duration_sec": 300,
                "views": 20000,
                "likes": 400,
                "comments": 10,
                "favorites": 200,
                "shares": 20,
            },
            {
                "platform": "douyin",
                "work_id": "dy3",
                "title": "另一条常规视频测试",
                "url": "https://www.douyin.com/video/dy3",
                "published_at": "2026-10-08",
                "published_ts": 1791380000,
                "duration_sec": 280,
                "views": 18000,
                "likes": 350,
                "comments": 8,
                "favorites": 180,
                "shares": 15,
            },
            {
                "platform": "bilibili",
                "work_id": "BV1SGpC6YERF",
                "title": "一条视频涨粉5k，AI时代新手博主的版本答案",
                "url": "https://www.bilibili.com/video/BV1SGpC6YERF",
                "published_at": "2026-10-14",
                "published_ts": 1791937730,
                "duration_sec": 1000,
                "views": 18,
                "likes": 1,
                "comments": 0,
                "favorites": 0,
                "shares": 0,
            },
            {
                "platform": "youtube",
                "work_id": "geyAcj3gUuQ",
                "title": "一条视频涨粉5k，AI时代新手博主的版本答案",
                "url": "https://youtu.be/geyAcj3gUuQ",
                "published_at": "2026-10-14",
                "published_ts": 1791940000,
                "duration_sec": 1000,
                "views": 2,
                "likes": 0,
                "comments": 0,
                "favorites": 0,
                "shares": 0,
            },
        ],
    )

    an = metrics.build_analytics(conn)
    assert an["hasLiveWorks"] is True
    assert an["totalWorks"] == 5
    # 同一期视频自动归并 3 平台：120000 + 18 + 2 = 120020
    top = an["episodes"][0]
    assert top["platformCount"] == 3
    assert top["views"] == 120020
    # 抖音中位数 = 20000，dy1 = 6.0× 命中 3× 爆款
    assert an["douyin"]["medianViews"] == 20000
    assert an["douyin"]["hit3xCount"] == 1



