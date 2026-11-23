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


def test_newsletter_issue_parser_and_original_matching(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    vroot = tmp_path / "vault"
    news_dir = vroot / "006_ai daily newsletter"
    news_dir.mkdir(parents=True)
    (news_dir / "26-11-22.md").write_text(
        """# AI Daily Newsletter — 2026-11-22

## 快讯

### 底层工具

- **OpenAI Devs X / Michael Luo** | [OpenAI Agents API 宣布支持 Daybreak 访问](https://x.com/OpenAIDevs/status/2123924430120419589)
  OpenAI 宣布 Agents API 可接入 Daybreak，覆盖持续安全监测与人工审查分流。

### 工作流

- **claude-code-releases** | [Claude Code v2.1.330](https://github.com/anthropics/claude-code/releases/tag/v2.1.330)
  新版增加企业组织登录和内置图表。

## 深读

### [Claude Code v2.1.330](https://github.com/anthropics/claude-code/releases/tag/v2.1.330)

这是一段更详细的深读分析。

## 视频更新

### YouTube

- **Park Channel** | [视频演示](https://www.youtube.com/watch?v=abc12345)
  演示完整工作流。
""",
        encoding="utf-8",
    )
    items_root = tmp_path / "processed"
    item_file = items_root / "26-11-22" / "openai" / "daybreak.md"
    item_file.parent.mkdir(parents=True)
    item_file.write_text(
        """---
url: https://x.com/OpenAIDevs/status/2123924430120419589
---

# Big news: OpenAI's Agents API now supports Daybreak access!

Some use cases:
- Investigate suspicious activity
- Verify security fixes
""",
        encoding="utf-8",
    )
    config.save_config({"obsidianPath": str(vroot), "newsletterItemsPath": str(items_root)})
    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    res = client.get("/api/source/newsletter").json()
    iss = res["issue"]
    assert iss["day"] == "2026-11-22"
    assert iss["total"] == 3
    assert iss["parts"][0]["name"] == "快讯"
    assert iss["parts"][0]["count"] == 2
    assert iss["parts"][0]["groups"][0]["name"] == "底层工具"
    first = iss["parts"][0]["groups"][0]["items"][0]
    assert first["site"] == "X"
    assert first["hasOriginal"] is True

    detail = client.get(f"/api/source/newsletter/item?day=2026-11-22&id={first['id']}").json()
    assert "Investigate suspicious activity" in detail["original"]

    second = iss["parts"][0]["groups"][1]["items"][0]
    assert second["hasDeep"] is True
    detail2 = client.get(f"/api/source/newsletter/item?day=2026-11-22&id={second['id']}").json()
    assert "深读分析" in detail2["deep"]

