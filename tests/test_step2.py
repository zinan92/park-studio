"""Step 2 自动化测试：中文数字解析、粉丝实测与历史回填、平台开关持久化、系统状态与 CDP 模拟测试。"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from park_studio import app as app_mod, cdp, config, db, platforms


def test_parse_cn_num() -> None:
    assert platforms.parse_cn_num("3.8万") == 38000
    assert platforms.parse_cn_num("12,480") == 12480
    assert platforms.parse_cn_num("4.4K") == 4400
    assert platforms.parse_cn_num("1.2M") == 1200000
    assert platforms.parse_cn_num(999) == 999
    assert platforms.parse_cn_num("") is None


def test_save_follower_reading_live_and_backfill(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    conn = db.connect(tmp_path / "data" / "studio.db")
    db.init_db(conn)

    today = date.today()
    d1 = (today - timedelta(days=1)).isoformat()
    d2 = (today - timedelta(days=2)).isoformat()

    # 先写入一条昨天已有的 live 实测值，确保后续 backfill 绝不覆盖 live
    conn.execute(
        "INSERT INTO followers_daily(day, platform, total, gain, loss, source, collected_at) VALUES (?,?,?,?,?,?,?)",
        (d1, "bilibili", 28000, None, None, "live", db.now_iso()),
    )
    conn.commit()

    bf = platforms.save_follower_reading(
        conn,
        "bilibili",
        {
            "total": 28410,
            "today_net": 110,
            "history": [
                {"day": d1, "net": 90},
                {"day": d2, "net": 80},
            ],
        },
    )
    assert bf == 1  # d1 是 live 跳过，d2 补齐
    fmap = platforms.get_followers_map(conn, days=10)
    assert fmap["bilibili"][today.isoformat()] == 28410
    assert fmap["bilibili"][d1] == 28000  # 保留 live 值不被覆盖
    assert fmap["bilibili"][d2] == 28210  # 28410 - 110 - 90


def test_step2_api_status_toggle_and_feishu_validation(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("PARK_STUDIO_DATA", str(tmp_path / "data"))
    config.save_config({"obsidianPath": str(tmp_path / "empty"), "chromePort": 19333})

    client = TestClient(app_mod.create_app(tmp_path / "data" / "studio.db"))

    # 1. 系统状态（未启动 Chrome 时优雅返回 online=False）
    st = client.get("/api/system/status")
    assert st.status_code == 200
    body = st.json()
    assert body["chromeStatus"]["online"] is False
    assert body["chromeStatus"]["port"] == 19333
    assert set(body["platformStatus"].keys()) == set(platforms.PLAT_ORDER)

    # 2. 停用 / 启用平台持久化
    tog = client.patch("/api/platforms/wechat", json={"disabled": True})
    assert tog.status_code == 200
    assert tog.json()["platformStatus"]["wechat"]["disabled"] is True
    assert client.get("/api/system/status").json()["platformStatus"]["wechat"]["disabled"] is True

    # 3. 飞书空 Webhook 清晰报错
    bad_fs = client.post("/api/feishu/test", json={"webhook": ""})
    assert bad_fs.status_code == 400

    # 4. 模拟 CDP 体检与粉丝采集接口闭环
    async def fake_check(pids, conn, cfg=None):
        conn.execute(
            "UPDATE platform_status SET state='ok', detail='模拟探活通过', checked_at='刚刚' WHERE platform='douyin'"
        )
        conn.commit()
        return {"ok": True, "results": {"douyin": {"state": "ok", "detail": "模拟探活通过"}}, "checked_at": "刚刚"}

    monkeypatch.setattr(platforms, "check_platforms", fake_check)
    chk = client.post("/api/platforms/check", json={"platforms": ["douyin"]})
    assert chk.status_code == 200
    assert chk.json()["platformStatus"]["douyin"]["state"] == "ok"
    assert cdp.find_chrome_binary() is None or isinstance(cdp.find_chrome_binary(), str)
