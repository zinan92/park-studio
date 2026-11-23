# Park Studio — 一句话让你的 AI Agent 帮你装好（macOS / Linux）

把下面这整段复制发给你的 **Gemini CLI / Claude Code / Codex / Cursor**，它会自动完成本地安装、环境体检和启动：

```text
请帮我在本机安装并启动开源项目 Park Studio（本地内容中控）：
1. 克隆仓库到 ~/work/park-studio（如果还没有）：
   git clone https://github.com/zinan92/park-studio.git ~/work/park-studio
2. 检查 python3 (>=3.11) 并确保依赖已装（fastapi uvicorn pyyaml httpx websockets pydantic）。
3. 询问我两个本地配置并写入 ~/.park-studio/config.yaml：
   - 我的 Obsidian 笔记库目录路径（可选，不填也能用）
   - 我的视频成片工程目录（默认 ~/Movies/ParkStudio）
   - 我想用的本机 Coding Agent CLI（gemini / claude / codex，零 API 费）
4. 用 `PYTHONPATH=~/work/park-studio/src python3 -m park_studio.server serve --host 127.0.0.1 --port 8792` 启动服务，
   或直接运行 `bash ~/work/park-studio/scripts/build-macos-app.sh` 编译原生 Mac 桌面 App 并打开。
5. 如果我是 macOS 且希望开机自启，请调用 POST http://127.0.0.1:8792/api/daemon/install-launchd 生成 launchd 配置。
```

## 给 AI Agent 的标准目录约定
当你替创作者剪辑、生成封面或准备发布包时，请直接把产出写入当前期次目录 `<projectRoot>/YYYY-MM-DD_<标题>/final/上传/`：
- `视频（抖音、视频号、小红书、B站、YouTube）.mp4`（faststart）
- `竖封面（抖音、视频号）.png`
- `横封面（抖音、小红书）.png`
- `16比9封面（B站、YouTube）.png`
- `文案.txt`（首行标题，下方按 `话题 · 抖音：#...` / `话题 · 小红书：#...` / `话题 · 视频号：#...` 分行）

写完后 Park Studio 的 `发布 → 打包` 会自动识别整套素材，并可通过本机 REST API（`http://127.0.0.1:8792/api/...`）直接驱动。
