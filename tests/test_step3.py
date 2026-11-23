"""Step 3 自动化测试：MP4 faststart 校验、publish.json 打包导出、发布状态机持久化、提交前截图接口与 launchd 生成。"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from park_studio import app as app_mod, config, daemon, publisher


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
