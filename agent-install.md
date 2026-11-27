# Park Studio — 一句话让你的 Coding Agent 帮你装好（macOS / Linux）

把下面这整段复制发给你的 **Claude Code / Codex / Gemini CLI / Antigravity / Cursor**，它会自动完成本地安装、环境体检（`doctor`）和启动：

```text
请帮我在本机安装并启动开源项目 Park Studio（本地内容中控）：
1. 克隆仓库到本地目录（例如 ~/park-studio，如果还没有）：
   git clone https://github.com/zinan92/park-studio.git
   cd park-studio
2. 创建虚拟环境并安装核心依赖（含 fastapi / uvicorn / pyyaml / httpx / websockets）：
   python3 -m venv .venv && source .venv/bin/activate && pip install -e .
3. 运行内置环境自检，确认所有必需项 [OK]（并告诉我哪些可选依赖缺失）：
   park-studio doctor
4. 如需本地视频粗剪与链接拆解，按 doctor 提示补装 ffmpeg / mlx-whisper (Apple Silicon) 或 faster-whisper / yt-dlp。
5. 启动方式（二选一）：
   - **macOS 推荐（原生桌面 App，本地编译无 Gatekeeper 拦截、无需常驻终端）**：
     bash scripts/build-macos-app.sh && cp -R "dist/Park Studio.app" "/Applications/" && open "/Applications/Park Studio.app"
   - **或命令行启动 Web 版**（Linux / 调试用）：
     park-studio serve --host 127.0.0.1 --port 8792
```

---

## 跨电脑迁移（把旧 Mac 的登录态与历史数据迁到新 Mac）

> **注意**：macOS 上 Chrome 会用本机 Keychain 加密 Cookies，**直接复制 `~/.park-studio/chrome-profile` 文件夹到新 Mac 会导致登录态失效**。请用内置 CDP 命令安全迁移：

1. **在旧电脑上导出 Cookies（已解密 JSON，权限 600）**：
   ```bash
   park-studio cookies export ~/Desktop/park-cookies.json
   ```
2. **把以下文件通过 AirDrop 传到新电脑**（切勿上传到 GitHub）：
   - `~/Desktop/park-cookies.json`（登录态）
   - `~/.park-studio/studio.db`（历史粉丝、作品、1/3/7 天快照、咨询客户等全部数据）
   - `~/.park-studio/config.yaml`（本地配置）
3. **在新电脑上导入 Cookies 并还原数据库**：
   ```bash
   mkdir -p ~/.park-studio
   cp ~/Downloads/studio.db ~/.park-studio/studio.db
   cp ~/Downloads/config.yaml ~/.park-studio/config.yaml
   park-studio cookies import ~/Downloads/park-cookies.json
   rm -f ~/Downloads/park-cookies.json
   ```
4. 打开 Park Studio「系统 → 全部检查」验证登录态（微信视频号/公众号若触发跨设备风控，单独点「去登录」补扫一次即可）。

---

## 给 AI Agent 的标准目录约定

当你替创作者剪辑、生成封面或准备发布包时，请直接把产出写入当前期次目录 `<projectRoot>/YYYY-MM-DD_<标题>/final/上传/`：
- `视频（抖音、视频号、小红书、B站、YouTube）.mp4`（faststart）
- `竖封面（抖音、视频号）.png`
- `横封面（抖音、小红书）.png`
- `16比9封面（B站、YouTube）.png`
- `文案.txt`（首行标题，下方按 `话题 · 抖音：#...` / `话题 · 小红书：#...` / `话题 · 视频号：#...` 分行）

写完后 Park Studio 的 `发布 → 打包` 会自动识别整套素材，并可通过本机 REST API（`http://127.0.0.1:8792/api/...`）直接驱动。
