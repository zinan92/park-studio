"""Step 1 自动化测试：配置、SQLite 持久化、Obsidian 只读扫描、本地 AI CLI 命令构造、FastAPI 接口与 worktable.json 导出。"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from fastapi.testclient import TestClient

from park_studio import ai, app as app_mod, config, vault


def test_vault_scan_and_path_traversal(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    vroot = tmp_path / "vault"
    (vroot / "006_ai daily newsletter").mkdir(parents=True)
    (vroot / "003_park原始输出").mkdir(parents=True)
    (vroot / "006_ai daily newsletter" / "26-11-22.md").write_text("---\ntitle: test\n---\n# 今日 AI 日报\n内容正文测试。", encoding="utf-8")
    (vroot / "003_park原始输出" / "idea.md").write_text("# 一人公司全流程\n这是我的原始思考。", encoding="utf-8")

    cfg = config.save_config({"obsidianPath": str(vroot)})
    st = vault.vault_status(cfg)
    assert st["mounted"] is True
    assert st["counts"]["newsletter"] == 1
    assert st["counts"]["writing"] == 1

    news = vault.scan_bucket("newsletter", cfg=cfg)
    assert len(news) == 1
    assert news[0]["title"] == "今日 AI 日报"
    assert "内容正文测试" in news[0]["excerpt"]

    # 路径穿越防护
    assert vault.read_note("../../etc/passwd", cfg=cfg) is None
    ok_note = vault.read_note("003_park原始输出/idea.md", cfg=cfg)
    assert ok_note is not None and ok_note["title"] == "一人公司全流程"


def test_ai_cli_builders_and_gemini_fallback() -> None:
    g_argv = ai.build_gemini_argv("hello", model="neon")
    assert "-m" in g_argv and "neon" in g_argv and "-p" in g_argv

    calls = []

    def fake_runner(argv, **kwargs):
        calls.append(argv)
        if "-m" in argv:
            return subprocess.CompletedProcess(argv, 1, stdout="", stderr="Error: model neon not found")
        return subprocess.CompletedProcess(argv, 0, stdout="Loaded cached credentials.\nOK_RESULT", stderr="")

    res = ai.run_prompt("hi", cfg={"aiBackend": "gemini", "aiModel": "neon"}, runner=fake_runner)
    assert len(calls) == 2
    assert res["text"] == "OK_RESULT"
    assert res["backend"] == "gemini"


def test_fastapi_step1_crud_and_worktable_export(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    vroot = tmp_path / "vault"
    (vroot / "006_ai daily newsletter").mkdir(parents=True)
    (vroot / "006_ai daily newsletter" / "26-11-22.md").write_text("# 测试日报\nhello", encoding="utf-8")
    config.save_config({"obsidianPath": str(vroot), "aiBackend": "gemini", "aiModel": "neon"})

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # health & bootstrap
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["active_ai"] == {"backend": "gemini", "model": "neon"}

    b = client.get("/api/bootstrap").json()
    assert b["vaultStatus"]["mounted"] is True
    assert len(b["vault"]["newsletter"]) == 1
    assert len(b["topics"]) >= 1

    # create & finalize topic
    created = client.post("/api/topics", json={"title": "测试新选题", "source_ref": "Obsidian"}).json()
    tid = created["id"]
    updated = client.patch(f"/api/topics/{tid}", json={"body": "测试口播稿正文", "finalize": True}).json()
    assert updated["final_at"] is not None
    assert updated["stage"] == "剪"

    # export real worktable.json
    cut_id = b["cutProject"]["id"]
    exp = client.post(f"/api/cut/{cut_id}/export-worktable").json()
    assert exp["ok"] is True
    wt_file = Path(exp["path"])
    assert wt_file.is_file()
    saved = json.loads(wt_file.read_text(encoding="utf-8"))
    assert saved["schema"] == "park-studio/worktable/v1"
    assert len(saved["shots"]) >= 1
