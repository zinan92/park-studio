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
