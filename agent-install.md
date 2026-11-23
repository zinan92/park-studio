# Park Studio — 一句话让你的 AI Agent 帮你装好（macOS / Linux）

把下面这整段复制发给你的 **Gemini CLI / Claude Code / Codex / Cursor**，它会自动完成本地安装、环境体检和启动：

```text
请帮我在本机安装并启动开源项目 Park Studio（本地内容中控）：
1. 克隆仓库到 ~/work/park-studio（如果还没有）：
   git clone https://github.com/zinan92/park-studio.git ~/work/park-studio
2. 检查 python3 (>=3.11) 并安装依赖（fastapi uvicorn pyyaml httpx websockets pydantic）。
3. 询问我两个本地配置并写入 ~/.park-studio/config.yaml：
   - 我的 Obsidian 笔记库目录路径（可选，不填也能用）
   - 我想用的本机 Coding Agent CLI（gemini / claude / codex，默认自动检测，零 API 费）
4. 用 `PYTHONPATH=~/work/park-studio/src python3 -m park_studio.server serve --host 127.0.0.1 --port 8792` 启动服务，
   并在浏览器打开 http://127.0.0.1:8792/。
5. 如果我是 macOS 且希望开机自启，请调用 POST http://127.0.0.1:8792/api/daemon/install-launchd 生成 launchd 配置。
```

## 为什么安全？
- **100% 本地运行**：SQLite 数据库与配置只存在 `~/.park-studio/`，不向任何第三方上传你的草稿或 Cookie。
- **独立专用 Chrome（CDP :9333）**：独立 Profile（`~/.park-studio/chrome-profile`），不碰你的日常浏览器。
- **国内 4 平台严格只填不发**：抖音 / 小红书 / B站 / 视频号仅自动传视频、填文案并截图留档，最后一下发布由你亲自确认点击。
