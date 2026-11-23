# Park Studio

> **100% MIT 全开源的本地内容生产线与多平台运营中控（Web + 原生 Mac App）**  
> 零强制 API 费 · 本地 Obsidian 只读 · 统一工程目录规范 · 自研专用 Chrome CDP 7 平台半自动发布闭环

Park Studio 把创作者从「找选题 → 写稿审稿 → 剪辑镜头表 → 7 平台自动填表发布 → 全网运营大屏与同龄复盘」完整收拢进一个极简的 Apple Liquid Glass 悬浮毛玻璃工作台：

```
[ 中控 | 选题 | 剪辑 | 发布 | 复盘 ]
```

---

## 核心特性

1. **中控（第一屏 = 正在做 + 运营大屏）**
   - 顶部「正在做」推进条直达当前停下的步骤（正在剪的集数、待点发的平台、今日 AI 日报头条）。
   - 全平台总粉丝堆叠走势、最新一期 7 平台发布进展、AI 一句话人话结论与 7 平台独立趋势卡。
2. **选题（只读接入本机 Obsidian + 本机 Coding Agent 零 API 费）**
   - 按期/按条解析 AI 日报（分区快讯、深读自动挂载、原文阅读器、`+ 加入选题` 一键写入本地 SQLite）。
   - 直接调用本机已安装的 **Gemini CLI / Claude Code / Codex**（或自定义 OpenAI 兼容 API）生成开头钩子与「价值 / 共鸣 / 节奏」三路审稿诊断。
3. **剪辑（3 步镜头表 Spec Table）**
   - `Hook → 动效·镜头表 → 导出 worktable.json 交给 AI Agent`。
4. **发布（100% MIT 自研 CDP 多平台填表引擎，零闭源插件依赖）**
   - 独立专用 Chrome（`~/.park-studio/chrome-profile`，CDP `:9333`），不碰你的日常浏览器，一次扫码长期保活。
   - **安全护栏**：国内 4 家（抖音 / 小红书 / B站 / 视频号）严格「只填不点发」——自动传成片、填标题文案与话题并截取提交前 JPEG 存档，最后一下发布由创作者亲自核对点击。
   - 发布后自动扫创作者后台取回作品链接与实测播放/粉丝数写回 SQLite。
5. **统一工程目录规范（零心智负担）**
   - 从「定稿」自动按统一规范建目录，所有 AI Agent 与发布引擎共用同一套结构，人类无需操心文件夹怎么建：
   ```text
   <projectRoot>/YYYY-MM-DD_<作品标题>/
   ├── 拍摄提纲.md
   ├── cut-plan.json
   ├── subtitles/source.srt
   ├── analysis/worktable.json
   └── final/上传/
       ├── 视频（抖音、视频号、小红书、B站、YouTube）.mp4
       ├── 竖封面（抖音、视频号）.png
       ├── 横封面（抖音、小红书）.png
       ├── 16比9封面（B站、YouTube）.png
       ├── 文案.txt
       └── publish.json
   ```

---

## 快速开始

### 方式 A：把一句话交给你的 AI Agent 自动装好（最推荐）
直接复制 [agent-install.md](agent-install.md) 里的提示词发给 Gemini CLI / Claude Code / Codex / Cursor。

### 方式 B：5 分钟手动启动（macOS / Linux）
```bash
git clone https://github.com/zinan92/park-studio.git
cd park-studio
bash scripts/install.sh
```
启动后浏览器打开 `http://127.0.0.1:8792/` 即可使用。

### 方式 C：一键打包原生 Mac 桌面 App（`.app` + `.dmg`）
macOS 下无需下载 Rust/Electron，直接用系统自带 Swift 编译几百 KB 的纯原生透明标题栏桌面 App：
```bash
bash scripts/build-macos-app.sh
open "dist/Park Studio.app"
```

---

## 隐私与安全承诺
- **数据 100% 留在本地**：所有配置与 SQLite 数据库仅存于 `~/.park-studio/`，绝不上传你的笔记、草稿、Cookie 或账号密码。
- **Obsidian 严格只读**：Park Studio 只读取你的笔记库，绝不改写你的任何 `.md` 文件。
- **开源协议**：MIT License，全部功能完整开源。
