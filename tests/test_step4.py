"""Step 4 (v0.4.0) Standalone 全闭环自动化测试：
- 本地依赖体检（deps.check_all_deps）
- 剪辑 Agent 权限门禁与 workspace-write 执行（ai.run_agent_execute）
- 内置封面工坊 3 比例 PNG 真实生成（covers.generate_episode_covers）
- 3 步 Onboarding 保存写稿/剪辑 Agent 分工与授权
- 贴链接抓字幕 7 角度拆解、一键扩写初稿、复盘爆款反推下期 3 选题与媒体流接口安全校验
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from park_studio import ai, app as app_mod, benchmarks, config, covers, cutter, deps


def test_v040_deps_check_and_onboarding_agent_roles(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    d = client.get("/api/deps").json()
    ids = {it["id"] for it in d["items"]}
    assert {"ffmpeg", "whisper", "ytdlp", "node", "chrome"}.issubset(ids)

    ob = client.post(
        "/api/onboarding/complete",
        json={
            "platforms": ["douyin", "youtube", "x"],
            "aiBackend": "gemini-api",
            "cutAgentBackend": "claude",
            "cutAgentAllowExec": True,
        },
    )
    assert ob.status_code == 200
    cfg = ob.json()["config"]
    assert cfg["cutAgentBackend"] == "claude"
    assert cfg["cutAgentAllowExec"] is True
    assert set(ob.json()["enabled"]) == {"douyin", "youtube", "x"}


def test_v040_agent_execute_permission_guard_and_argv(tmp_path: Path) -> None:
    # 未授权必须拒绝执行
    with pytest.raises(ai.AIError, match="尚未授权"):
        ai.run_agent_execute("render", cwd=tmp_path, cfg={"cutAgentBackend": "codex", "cutAgentAllowExec": False})

    # 授权后 Codex 使用 workspace-write 且在 cwd 中执行
    captured: dict = {}

    def fake_runner(argv, **kwargs):
        captured["argv"] = argv
        captured["cwd"] = kwargs.get("cwd")
        return SimpleNamespace(returncode=0, stdout="DONE_MP4", stderr="")

    res = ai.run_agent_execute(
        "render motion mp4",
        cwd=tmp_path,
        cfg={"cutAgentBackend": "codex", "cutAgentAllowExec": True},
        runner=fake_runner,
    )
    assert res["executed"] is True
    assert "-s" in captured["argv"] and "workspace-write" in captured["argv"]
    assert captured["cwd"] == str(tmp_path.resolve())


def test_v040_cover_studio_local_3_ratios_and_media_stream(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    proj_root = tmp_path / "exports"
    config.save_config({"obsidianPath": str(tmp_path / "empty"), "projectRoot": str(proj_root)})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 安全边界：绝不允许读取越界系统文件
    assert client.get("/api/media/stream", params={"path": "/etc/hosts"}).status_code == 403

    if not cutter._which("ffmpeg"):
        return

    eps = client.get("/api/publish/episodes").json()["episodes"]
    ep_id = eps[0]["id"]

    # 生成 1 秒测试视频并绑定，然后运行 1 秒本地 3 比例封面生成
    raw_mp4 = proj_root / "test.mp4"
    proj_root.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            cutter._which("ffmpeg"), "-nostdin", "-hide_banner", "-y",
            "-f", "lavfi", "-i", "color=c=0x223355:s=640x360:r=25:d=1",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(raw_mp4),
        ],
        check=True, capture_output=True,
    )
    client.post(f"/api/publish/{ep_id}/pack", json={"video_path": str(raw_mp4)})

    cov = client.post(
        f"/api/publish/{ep_id}/generate-covers",
        json={"mode": "local", "headline": "本地开源内容中控实测", "subtitle": "零 API 费"},
    )
    assert cov.status_code == 200
    cd = cov.json()
    assert cd["ok"] is True
    for k in ("cover_v", "cover_h", "cover_169"):
        p = Path(cd["covers"][k])
        assert p.is_file() and p.stat().st_size > 1000

    # 流式预览接口应可安全读取刚生成的封面 PNG
    img_resp = client.get("/api/media/stream", params={"path": cd["covers"]["cover_169"]})
    assert img_resp.status_code == 200
    assert img_resp.content.startswith(b"\x89PNG")


def test_v040_url_teardown_ai_draft_and_review_next_topics(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty")})

    monkeypatch.setattr(
        benchmarks,
        "fetch_url_transcript",
        lambda url, cfg=None: {
            "title": "Solo Founder 12-Platform Workflow",
            "author": "IndieMaker",
            "url": url,
            "transcript": "Here is how I cut and ship videos locally in 10 minutes.",
        },
    )

    def fake_run_prompt(prompt: str, **kwargs):
        if "反推出 3 个" in prompt:
            return {
                "text": json.dumps([
                    {"title": "续集1：本地粗剪实测", "angle": "从省时切入", "hook": "一条10分钟视频我只剪了3分钟"},
                    {"title": "续集2：12平台中英适配", "angle": "出海增量", "hook": "中文视频怎么一键发到LinkedIn和TikTok"},
                    {"title": "续集3：封面点击率翻倍", "angle": "视觉转化", "hook": "别再打开PS做封面了"},
                ], ensure_ascii=False),
                "backend": "gemini-api",
                "model": "gemini-2.5-flash",
            }
        if "短视频口播初稿" in prompt:
            return {"text": "前3秒直接抛反差：其实你根本不需要买一堆SaaS……", "backend": "gemini-api", "model": "gemini-2.5-flash"}
        return {
            "text": json.dumps({
                "mainline": "本地自动化让个人创作者产能翻倍",
                "why_hit": ["强对比", "可复现"],
                "universal_truth": "减少摩擦才能持续日更",
                "angles": [{"lens": l, "say": f"{l}开场白测试", "text": "展开", "needs_own": ""} for l in benchmarks.TEARDOWN_LENSES],
                "strongest": [{"lens": "个人经历", "index": 0, "why": "最真实"}],
            }, ensure_ascii=False),
            "backend": "gemini-api",
            "model": "gemini-2.5-flash",
        }

    monkeypatch.setattr(ai, "run_prompt", fake_run_prompt)

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 1. 贴链接一键拆解
    u = client.post("/api/benchmarks/from-url", json={"url": "https://www.youtube.com/watch?v=demo123", "mode": "standard"})
    assert u.status_code == 200
    assert len(u.json()["structured"]["angles"]) == 7

    # 2. 一键扩写口播初稿
    t_id = client.post("/api/topics", json={"title": "一人公司本地工作流"}).json()["id"]
    dr = client.post("/api/ai/draft", json={"topic_id": t_id, "title": "一人公司本地工作流", "body": ""})
    assert dr.status_code == 200
    assert "不需要买一堆SaaS" in dr.json()["body"]

    # 3. 复盘爆款反推下期 3 选题
    nx = client.post("/api/review/next-topics", json={"title": "一条视频涨粉5k", "views": 120000, "multiple": 6.0})
    assert nx.status_code == 200
    assert len(nx.json()["topics"]) == 3
