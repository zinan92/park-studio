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


def test_dual_mode_cutter_srt_render_and_landing(tmp_path: Path, monkeypatch) -> None:
    import subprocess
    from park_studio import cutter, db

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    root = tmp_path / "exports"
    cfg = config.save_config({
        "obsidianPath": str(tmp_path / "empty"),
        "projectRoot": str(root),
        "cutAgentBackend": "codex",
        "cutAgentModel": "o3",
    })

    env = cutter.check_env(cfg)
    assert env["cutAgent"]["effective"] == "codex"
    assert env["cutAgent"]["model"] == "o3"

    # 1. 解析 SRT + 自动识别口误重来与语气词
    srt_path = tmp_path / "demo.srt"
    srt_path.write_text(
        """1
00:00:00,100 --> 00:00:00,800
今天我们聊聊

2
00:00:00,900 --> 00:00:01,800
今天我们聊聊AI怎么帮你省下两小时。

3
00:00:01,900 --> 00:00:02,200
嗯

4
00:00:02,300 --> 00:00:02,900
真正厉害的创作者都在用这套工作流。
""",
        encoding="utf-8",
    )
    plan = cutter.parse_srt(srt_path)
    assert plan["engine"] == "srt"
    assert len(plan["lines"]) == 4
    # 第 1 句（重来前废句）与第 3 句（语气词）应自动标删
    assert 0 in plan["drop"]
    assert 2 in plan["drop"]
    assert 1 not in plan["drop"]
    assert 3 not in plan["drop"]

    # 2. 若本机装有 ffmpeg，做真实 3 秒合成视频的一键粗剪（-16 LUFS + ASS 字幕 + faststart）并自动落盘发布工作台
    if env["ffmpeg"]:
        raw_mp4 = tmp_path / "raw_demo.mp4"
        subprocess.run(
            [
                env["ffmpegPath"], "-nostdin", "-hide_banner", "-y",
                "-f", "lavfi", "-i", "color=c=0x1e1e1e:s=320x180:r=25:d=3",
                "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
                str(raw_mp4),
            ],
            check=True,
            capture_output=True,
        )

        # API 级测试：导入视频 + SRT 毫秒解析 + 导出 worktable.json
        client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
        env_res = client.get("/api/cut/env").json()
        assert env_res["ffmpeg"] is True

        cut_id = client.get("/api/bootstrap").json()["cutProject"]["id"]
        imp = client.post(
            f"/api/cut/{cut_id}/import-media",
            json={"video_path": str(raw_mp4), "srt_path": str(srt_path), "mode": "rough"},
        )
        assert imp.status_code == 200
        imp_data = imp.json()
        assert imp_data["ok"] is True
        assert imp_data["cutProject"]["videoInfo"]["width"] == 320
        assert len(imp_data["cutProject"]["lines"]) == 4

        exp = client.post(f"/api/cut/{cut_id}/export-worktable")
        assert exp.status_code == 200
        assert Path(exp.json()["path"]).is_file()

        # 真渲染 + 自动落盘到统一工程目录并导入发布工作台
        out_mp4 = tmp_path / "rendered.mp4"
        rendered = cutter.render_rough_cut(
            raw_mp4,
            plan,
            out_mp4,
            drop=plan["drop"],
            hooks=[3],
            burn_subs=bool(env["filters"]),
        )
        assert Path(rendered["file"]).is_file()
        assert rendered["seconds"] > 0.5
        assert publisher.check_mp4_faststart(out_mp4)["faststart"] is True

        conn = db.connect(tmp_path / "data" / "studio.db")
        db.init_db(conn)
        landed = cutter.land_into_publish_project(
            conn,
            title="双模式剪辑实测视频",
            rendered_mp4=out_mp4,
            cfg=cfg,
        )
        assert Path(landed["videoPath"]).is_file()
        assert landed["publishEpisode"]["preflight"]["video"]["faststart"] is True


def test_v030_twelve_platforms_and_global_toggle(tmp_path: Path, monkeypatch) -> None:
    from park_studio import platforms

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    assert len(platforms.PLAT_ORDER) == 12
    for pid in ("tiktok", "instagram", "threads", "linkedin", "meta"):
        assert pid in platforms.PLAT_ORDER
        assert pid in publisher.UPLOAD_URLS

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    boot = client.get("/api/bootstrap").json()
    ps = boot["platformStatus"]
    assert len(ps) == 12
    assert ps["douyin"]["disabled"] is False
    for pid in ("tiktok", "instagram", "threads", "linkedin", "meta"):
        assert ps[pid]["disabled"] is True

    # 一键启用 TikTok 后应写入 SQLite
    toggled = client.patch("/api/platforms/tiktok", json={"disabled": False})
    assert toggled.status_code == 200
    assert toggled.json()["platformStatus"]["tiktok"]["disabled"] is False


def test_v030_cut_import_clears_stale_hooks_and_shots(tmp_path: Path, monkeypatch) -> None:
    from park_studio import cutter

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    monkeypatch.setattr(
        cutter,
        "probe_video",
        lambda _p: {"duration": 12.5, "durationText": "12.5 秒", "width": 1920, "height": 1080, "sizeMb": 5.0},
    )
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    cut = client.get("/api/bootstrap").json()["cutProject"]
    cut_id = cut["id"]
    # 先确认默认示例有旧 hookIdx 和 shots
    assert len(cut["hookIdx"]) > 0
    assert len(cut["shots"]) > 0

    fake_video = tmp_path / "new_ep.mp4"
    fake_video.write_bytes(b"ftypmp42moov0000mdat0000")
    imp = client.post(
        f"/api/cut/{cut_id}/import-media",
        json={"video_path": str(fake_video), "mode": "rough"},
    )
    assert imp.status_code == 200
    updated = imp.json()["cutProject"]
    assert updated["hookIdx"] == []
    assert updated["shots"] == []
    assert updated["outputPath"] == ""


def test_v030_materials_four_kinds_and_pagination(tmp_path: Path, monkeypatch) -> None:
    from park_studio import materials

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    cat_dir = tmp_path / "catalog"
    cat_dir.mkdir()
    (cat_dir / "image-styles.json").write_text(json.dumps([{"id": "i1", "name": "极简白底", "cat": "封面"}]), encoding="utf-8")
    (cat_dir / "motion-styles.json").write_text(json.dumps([{"id": "m1", "name": "弹字", "cat": "字幕"}]), encoding="utf-8")
    (cat_dir / "motions.json").write_text(json.dumps({"cards": [{"id": "mc1", "title": "数字翻转", "group": "数据卡", "summary": "大字滚动"}]}), encoding="utf-8")
    (cat_dir / "make.json").write_text(json.dumps([{"id": "v1", "name": "Remotion", "group": "动效"}]), encoding="utf-8")
    (cat_dir / "video-cases.json").write_text(
        json.dumps([{"id": f"c{i}", "title": f"案例 {i}", "cat": "爆款"} for i in range(60)]),
        encoding="utf-8",
    )
    cfg = config.save_config({"obsidianPath": str(tmp_path / "empty"), "catalogDir": str(cat_dir)})
    page1 = materials.get_materials(kind="cases", offset=0, limit=20, cfg=cfg)
    assert page1["counts"]["image"] == 1
    assert page1["counts"]["motion"] == 2
    assert page1["counts"]["video"] == 1
    assert page1["counts"]["cases"] == 60
    assert page1["counts"]["all"] == 64
    assert len(page1["items"]) == 20
    assert page1["hasMore"] is True

    page3 = materials.get_materials(kind="cases", offset=40, limit=20, cfg=cfg)
    assert len(page3["items"]) == 20
    assert page3["hasMore"] is False


def test_v030_configurable_teardown_7_angles_and_ai_test(tmp_path: Path, monkeypatch) -> None:
    from park_studio import ai, benchmarks

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})

    captured_prompts: list[str] = []

    def fake_run_prompt(prompt: str, **kwargs):
        captured_prompts.append(prompt)
        if prompt.strip() == "请只回复 OK":
            return {"text": "OK", "backend": "gemini-api", "model": "gemini-2.5-flash"}
        if "CUSTOM_MARKER" in prompt:
            return {
                "text": json.dumps({"mainline": "自定义主线", "why_hit": ["自定义原因"], "markdown": "## 自定义\n完成"}, ensure_ascii=False),
                "backend": "gemini-api",
                "model": "gemini-2.5-flash",
            }
        angles = [
            {"lens": lens, "say": f"我用{lens}视角讲个实话，其实这件事没那么复杂。" * 3, "text": f"{lens}展开", "needs_own": "补一段自己数据"}
            for lens in benchmarks.TEARDOWN_LENSES
        ]
        payload = {
            "mainline": "普通人用本地工作流省下 80% 重复运营",
            "why_hit": ["强反差开头", "真实录屏证明"],
            "opening": {"hook": "前3秒抛反差数字", "promise": "看完就能自己装一套"},
            "segments": [{"part": "破题", "role": "留存", "summary": "晒痛点"}],
            "universal_truth": "工具的价值在于消除手动摩擦",
            "angles": angles,
            "strongest": [{"lens": "个人经历", "index": 0, "why": "最真实可信"}, {"lens": "认知反差", "index": 3, "why": "最抓前3秒"}],
            "hooks": ["钩子A", "钩子B"],
            "my_angle": "结合开源本地中控实战",
        }
        return {"text": json.dumps(payload, ensure_ascii=False), "backend": "gemini-api", "model": "gemini-2.5-flash"}

    monkeypatch.setattr(ai, "run_prompt", fake_run_prompt)

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 1. 标准 7 角度拆解 + 详情回读 structured
    r = client.post("/api/benchmarks/teardown", json={"title": "AI如何租人", "author": "测试博主", "mode": "standard"})
    assert r.status_code == 200
    data = r.json()
    assert data["mode"] == "standard"
    assert len(data["structured"]["angles"]) == 7
    assert len(data["structured"]["strongest"]) == 2
    det = client.get(f"/api/benchmarks/detail?id={data['id']}").json()
    assert len(det["structured"]["angles"]) == 7

    # 2. 自定义 Prompt 模板拆解
    r2 = client.post(
        "/api/benchmarks/teardown",
        json={"title": "自定义测试", "mode": "custom", "custom_prompt": "CUSTOM_MARKER 标题={title} 作者={author}"},
    )
    assert r2.status_code == 200
    assert any("CUSTOM_MARKER 标题=自定义测试" in p for p in captured_prompts)

    # 3. AI 连通性测试接口
    t = client.post("/api/ai/test", json={"aiBackend": "gemini-api", "aiModel": "gemini-2.5-flash"})
    assert t.status_code == 200
    assert t.json()["ok"] is True
    assert t.json()["reply"] == "OK"


def test_v030_onboarding_subset_platforms(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 全新用户首次启动应弹出平台选择引导
    boot1 = client.get("/api/bootstrap").json()
    assert boot1["needsOnboarding"] is True

    # 用户只发 5 个平台（如 抖音、小红书、B站、YouTube、TikTok）
    picked = ["douyin", "xhs", "bilibili", "youtube", "tiktok"]
    done = client.post("/api/onboarding/complete", json={"platforms": picked, "aiBackend": "gemini-api"})
    assert done.status_code == 200
    res = done.json()
    assert res["ok"] is True
    assert res["needsOnboarding"] is False
    assert set(res["enabled"]) == set(picked)

    ps = res["platformStatus"]
    for pid, st in ps.items():
        if pid in picked:
            assert st["disabled"] is False
        else:
            assert st["disabled"] is True

    # 再次 bootstrap 不再重复弹引导
    boot2 = client.get("/api/bootstrap").json()
    assert boot2["needsOnboarding"] is False
    assert boot2["config"]["onboardingDone"] is True


def test_v031_localize_copy_12_platforms_and_translate_srt(tmp_path: Path, monkeypatch) -> None:
    from park_studio import ai

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})

    # 1. parse_copy_txt 覆盖海外 5 平台
    parsed_copy = projects.parse_copy_txt(
        "本地开源工作台实测\n\n"
        "话题 · 抖音：#AI工具 #一人公司\n"
        "话题 · TikTok：#AIWorkflow #SoloFounder\n"
        "话题 · LinkedIn：#OpenSource #CreatorOS\n"
        "话题 · Instagram：#ReelsAI\n"
        "话题 · Threads：#BuildInPublic\n"
        "话题 · Meta：#CreatorTools\n"
    )
    for pid in ("douyin", "tiktok", "linkedin", "instagram", "threads", "meta"):
        assert pid in parsed_copy["platforms"]
        assert len(parsed_copy["platforms"][pid]["tags"]) >= 1

    # 2. Mock AI 测试分平台中→英本地化适配 + 英文 SRT 导出
    def fake_run_prompt(prompt: str, **kwargs):
        if "subtitle translator" in prompt:
            return {
                "text": json.dumps({"0": "Welcome to Park Studio.", "1": "One local hub for 12 platforms."}, ensure_ascii=False),
                "backend": "gemini-api",
                "model": "gemini-2.5-flash",
            }
        return {
            "text": json.dumps({
                "douyin": {"lang": "zh", "title": "我把 4 个内容工具合并成 1 个开源中控", "description": "零 API 费本地剪辑加发布", "tags": ["AI工作流", "开源"]},
                "youtube": {"lang": "en", "title": "I Merged 4 Creator Tools Into 1 Local Open-Source OS", "description": "Local-first editing and multi-platform publishing with zero SaaS fees.", "tags": ["CreatorOS", "OpenSource"]},
                "linkedin": {"lang": "en", "title": "Why I built a local-first Creator OS", "description": "Key takeaways for solo builders shipping across 12 platforms.", "tags": ["BuildInPublic", "OpenSource"]},
                "tiktok": {"lang": "en", "title": "One local app for 12 platforms", "description": "Stop paying monthly for video workflows.", "tags": ["AIWorkflow", "SoloCreator"]},
            }, ensure_ascii=False),
            "backend": "gemini-api",
            "model": "gemini-2.5-flash",
        }

    monkeypatch.setattr(ai, "run_prompt", fake_run_prompt)

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))
    eps = client.get("/api/publish/episodes").json()["episodes"]
    ep_id = eps[0]["id"]

    loc = client.post(
        f"/api/publish/{ep_id}/localize",
        json={"platforms": ["douyin", "youtube", "linkedin", "tiktok"]},
    )
    assert loc.status_code == 200
    ld = loc.json()
    assert ld["ok"] is True
    assert ld["localized"] == 4
    assert ld["platforms"]["youtube"]["lang"] == "en"
    assert "Local Open-Source OS" in ld["platforms"]["youtube"]["title"]
    assert ld["platforms"]["douyin"]["lang"] == "zh"
    # 验证 _copy_for_platform 自动读到英文版本
    li_title, li_desc, li_tags = publisher._copy_for_platform(ld["episode"], "linkedin")
    assert "local-first Creator OS" in li_title
    assert "BuildInPublic" in li_tags

    # 3. 英文 .srt 字幕生成
    cut_id = client.get("/api/bootstrap").json()["cutProject"]["id"]
    srt_res = client.post(f"/api/cut/{cut_id}/translate-srt", json={"target_lang": "en", "bilingual": False})
    assert srt_res.status_code == 200
    sd = srt_res.json()
    assert sd["ok"] is True
    assert sd["cues"] >= 2
    srt_file = Path(sd["path"])
    assert srt_file.is_file()
    srt_txt = srt_file.read_text(encoding="utf-8")
    assert "-->" in srt_txt
    assert "Welcome to Park Studio." in srt_txt

    # 4. i18n.js 静态资源与 uiLang 配置持久化
    assert client.get("/js/i18n.js").status_code == 200
    saved_lang = client.put("/api/settings", json={"uiLang": "en"})
    assert saved_lang.status_code == 200
    assert saved_lang.json()["config"]["uiLang"] == "en"


def test_v032_health_version_and_github_update_check(tmp_path: Path, monkeypatch) -> None:
    import httpx
    from park_studio import __version__

    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 1. /api/health 版本号必须与 __version__ 同步
    h = client.get("/api/health").json()
    assert h["ok"] is True
    assert h["version"] == __version__

    # 2. 模拟 GitHub Releases 返回新版本 v0.9.0
    class FakeResp:
        status_code = 200

        def json(self):
            return {
                "tag_name": "v0.9.0",
                "html_url": "https://github.com/zinan92/park-studio/releases/tag/v0.9.0",
                "published_at": "2026-12-01T00:00:00Z",
                "assets": [{"name": "Park-Studio.dmg", "browser_download_url": "https://example.com/Park-Studio.dmg"}],
            }

    monkeypatch.setattr(httpx, "get", lambda *a, **kw: FakeResp())
    upd = client.get("/api/app/check-update").json()
    assert upd["ok"] is True
    assert upd["hasUpdate"] is True
    assert upd["latest"] == "0.9.0"
    assert upd["downloadUrl"].endswith("Park-Studio.dmg")







