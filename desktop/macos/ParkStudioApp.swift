import Cocoa
import UniformTypeIdentifiers
import WebKit

final class ParkStudioDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var serverProcess: Process?
    private var activePort: Int = 8792
    private var isBootstrappingVenv = false
    private var baseURL: URL { URL(string: "http://127.0.0.1:\(activePort)/")! }

    private var dataDirURL: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".park-studio", isDirectory: true)
    }

    private var desktopLogURL: URL {
        dataDirURL.appendingPathComponent("desktop.log")
    }

    private var managedVenvPython: String {
        dataDirURL.appendingPathComponent("venv/bin/python3").path
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        try? FileManager.default.createDirectory(at: dataDirURL, withIntermediateDirectories: true)
        setupMenus()
        setupWindow()
        ensureBackendAndLoad()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            window.makeKeyAndOrderFront(nil)
        }
        NSApp.activate(ignoringOtherApps: true)
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let proc = serverProcess, proc.isRunning {
            proc.terminate()
        }
    }

    // MARK: - Window & WebView Setup

    private func setupWindow() {
        let defaultRect = NSRect(x: 0, y: 0, width: 1380, height: 880)
        window = NSWindow(
            contentRect: defaultRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.delegate = self
        window.title = "Park Studio"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = false
        window.backgroundColor = NSColor(calibratedRed: 0.067, green: 0.071, blue: 0.078, alpha: 1.0)
        window.minSize = NSSize(width: 960, height: 640)
        window.collectionBehavior = [.fullScreenPrimary]
        if !window.setFrameUsingName("ParkStudioMainWindow") {
            window.center()
        }
        window.setFrameAutosaveName("ParkStudioMainWindow")

        let cfg = WKWebViewConfiguration()
        cfg.applicationNameForUserAgent = "ParkStudioMacApp/2.0"
        cfg.preferences.setValue(true, forKey: "developerExtrasEnabled")
        cfg.userContentController.add(self, name: "parkStudio")

        webView = WKWebView(frame: window.contentView!.bounds, configuration: cfg)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.setValue(false, forKey: "drawsBackground")
        window.contentView?.addSubview(webView)

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: - Fullscreen Traffic Light Sync

    func windowWillEnterFullScreen(_ notification: Notification) {
        webView.evaluateJavaScript("document.documentElement.classList.add('macos-fullscreen')", completionHandler: nil)
    }

    func windowWillExitFullScreen(_ notification: Notification) {
        webView.evaluateJavaScript("document.documentElement.classList.remove('macos-fullscreen')", completionHandler: nil)
    }

    // MARK: - Native JS <-> Swift Bridge

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "parkStudio", let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "drag":
            if let ev = NSApp.currentEvent {
                window.performDrag(with: ev)
            }
        case "doubleClick":
            window.performZoom(nil)
        case "theme":
            let theme = (body["theme"] as? String) ?? "dark"
            applyWindowTheme(theme)
        case "pickPath":
            let reqId = (body["requestId"] as? String) ?? ""
            let mode = (body["mode"] as? String) ?? "file"
            let exts = (body["exts"] as? [String]) ?? []
            openNativePicker(requestId: reqId, mode: mode, exts: exts)
        case "bootstrapVenv":
            bootstrapManagedVenv()
        case "retryStart":
            ensureBackendAndLoad()
        case "openLog":
            NSWorkspace.shared.open(desktopLogURL)
        default:
            break
        }
    }

    private func applyWindowTheme(_ theme: String) {
        if theme == "light" {
            window.appearance = NSAppearance(named: .aqua)
            window.backgroundColor = NSColor(calibratedRed: 0.976, green: 0.976, blue: 0.980, alpha: 1.0)
        } else {
            window.appearance = NSAppearance(named: .darkAqua)
            window.backgroundColor = NSColor(calibratedRed: 0.067, green: 0.071, blue: 0.078, alpha: 1.0)
        }
    }

    private func openNativePicker(requestId: String, mode: String, exts: [String]) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = (mode == "dir")
        panel.canChooseFiles = (mode != "dir")
        panel.canCreateDirectories = (mode == "dir")
        if mode != "dir" && !exts.isEmpty {
            let types = exts.compactMap { UTType(filenameExtension: $0.trimmingCharacters(in: CharacterSet(charactersIn: "."))) }
            if !types.isEmpty {
                panel.allowedContentTypes = types
            }
        }
        panel.beginSheetModal(for: window) { [weak self] resp in
            guard let self else { return }
            let path = (resp == .OK) ? (panel.url?.path ?? "") : ""
            if let data = try? JSONSerialization.data(withJSONObject: ["id": requestId, "path": path]),
               let jsonStr = String(data: data, encoding: .utf8) {
                self.webView.evaluateJavaScript("window.__psNativePickResult && window.__psNativePickResult(\(jsonStr))", completionHandler: nil)
            }
        }
    }

    // MARK: - Menus & Shortcuts

    private func setupMenus() {
        let mainMenu = NSMenu()

        // App menu
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于 Park Studio", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "隐藏 Park Studio", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "退出 Park Studio", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        mainMenu.addItem(appItem)

        // Edit menu
        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        editMenu.addItem(withTitle: "重做", action: Selector(("redo:")), keyEquivalent: "Z")
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "剪切", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "拷贝", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = editMenu
        mainMenu.addItem(editItem)

        // View menu
        let viewItem = NSMenuItem()
        let viewMenu = NSMenu(title: "显示")
        viewMenu.addItem(withTitle: "刷新页面", action: #selector(reloadPage), keyEquivalent: "r")
        let hardReload = NSMenuItem(title: "清缓存并强制刷新", action: #selector(hardReloadPage), keyEquivalent: "R")
        hardReload.keyEquivalentModifierMask = [.command, .shift]
        viewMenu.addItem(hardReload)
        viewMenu.addItem(NSMenuItem.separator())
        viewMenu.addItem(withTitle: "实际大小", action: #selector(zoomReset), keyEquivalent: "0")
        viewMenu.addItem(withTitle: "放大", action: #selector(zoomIn), keyEquivalent: "+")
        let zoomInEq = NSMenuItem(title: "放大", action: #selector(zoomIn), keyEquivalent: "=")
        zoomInEq.isAlternate = true
        zoomInEq.keyEquivalentModifierMask = [.command]
        viewMenu.addItem(zoomInEq)
        viewMenu.addItem(withTitle: "缩小", action: #selector(zoomOut), keyEquivalent: "-")
        viewMenu.addItem(NSMenuItem.separator())
        viewMenu.addItem(withTitle: "后退", action: #selector(goBack), keyEquivalent: "[")
        viewMenu.addItem(withTitle: "前进", action: #selector(goForward), keyEquivalent: "]")
        viewMenu.addItem(NSMenuItem.separator())
        let fsItem = NSMenuItem(title: "进入全屏", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fsItem.keyEquivalentModifierMask = [.command, .control]
        viewMenu.addItem(fsItem)
        viewItem.submenu = viewMenu
        mainMenu.addItem(viewItem)

        // Window menu
        let winItem = NSMenuItem()
        let winMenu = NSMenu(title: "窗口")
        winMenu.addItem(withTitle: "最小化", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        winMenu.addItem(withTitle: "缩放", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        winMenu.addItem(withTitle: "关闭窗口", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = winMenu
        mainMenu.addItem(winItem)

        NSApp.mainMenu = mainMenu
    }

    @objc private func reloadPage() { webView.reload() }

    @objc private func hardReloadPage() {
        let types: Set<String> = [WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache]
        WKWebsiteDataStore.default().removeData(ofTypes: types, modifiedSince: Date(timeIntervalSince1970: 0)) { [weak self] in
            self?.webView.reloadFromOrigin()
        }
    }

    @objc private func zoomReset() { webView.pageZoom = 1.0 }
    @objc private func zoomIn() { webView.pageZoom = min(1.6, webView.pageZoom + 0.1) }
    @objc private func zoomOut() { webView.pageZoom = max(0.75, webView.pageZoom - 0.1) }
    @objc private func goBack() { if webView.canGoBack { webView.goBack() } }
    @objc private func goForward() { if webView.canGoForward { webView.goForward() } }

    // MARK: - Health Check, Port Fallback & Managed Venv

    private func checkParkStudioHealth(port: Int, completion: @escaping (Bool) -> Void) {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.connectionProxyDictionary = [:]
        cfg.timeoutIntervalForRequest = 1.2
        let session = URLSession(configuration: cfg)
        let url = URL(string: "http://127.0.0.1:\(port)/api/health")!
        session.dataTask(with: url) { data, resp, _ in
            var ok = false
            if (resp as? HTTPURLResponse)?.statusCode == 200,
               let data,
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               (obj["ok"] as? Bool) == true,
               obj["data_dir"] != nil {
                ok = true
            }
            DispatchQueue.main.async { completion(ok) }
        }.resume()
    }

    private func isPortOccupied(_ port: Int) -> Bool {
        let sock = socket(AF_INET, SOCK_STREAM, 0)
        if sock < 0 { return false }
        defer { close(sock) }
        var addr = sockaddr_in()
        addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(UInt16(port).bigEndian)
        addr.sin_addr = in_addr(s_addr: inet_addr("127.0.0.1"))
        let res = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(sock, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        return res == 0
    }

    private func pickAvailablePort(preferred: Int = 8792) -> Int {
        for p in preferred..<(preferred + 20) {
            if !isPortOccupied(p) { return p }
        }
        return preferred
    }

    private func pythonCandidates() -> [String] {
        var list = [
            managedVenvPython,
            "/opt/homebrew/bin/python3",
            "/usr/local/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3",
            "/usr/bin/python3",
        ]
        let fm = FileManager.default
        list = list.filter { fm.isExecutableFile(atPath: $0) }
        return list
    }

    private func pythonHasDeps(_ pyBin: String) -> Bool {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: pyBin)
        p.arguments = ["-c", "import fastapi, uvicorn, yaml, httpx, websockets"]
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        do {
            try p.run()
            p.waitUntilExit()
            return p.terminationStatus == 0
        } catch {
            return false
        }
    }

    private func findReadyPython() -> String? {
        for cand in pythonCandidates() {
            if pythonHasDeps(cand) { return cand }
        }
        return nil
    }

    private func ensureBackendAndLoad() {
        checkParkStudioHealth(port: 8792) { [weak self] alive in
            guard let self else { return }
            if alive {
                self.activePort = 8792
                self.webView.load(URLRequest(url: self.baseURL))
                return
            }
            self.webView.loadHTMLString(self.loadingHTML(subtitle: "正在检查本机运行环境并启动服务…"), baseURL: nil)
            DispatchQueue.global(qos: .userInitiated).async {
                let readyPy = self.findReadyPython()
                let freePort = self.pickAvailablePort(preferred: 8792)
                DispatchQueue.main.async {
                    guard let pyBin = readyPy else {
                        self.webView.loadHTMLString(self.setupNeededHTML(), baseURL: nil)
                        return
                    }
                    self.activePort = freePort
                    self.startEmbeddedBackend(pyBin: pyBin)
                    self.pollUntilReady(attemptsLeft: 30)
                }
            }
        }
    }

    private func startEmbeddedBackend(pyBin: String) {
        let fm = FileManager.default
        let resSrc = Bundle.main.resourcePath.map { "\($0)/backend" } ?? ""
        let envSrc = ProcessInfo.processInfo.environment["PARK_STUDIO_SRC"] ?? ""

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: pyBin)
        proc.arguments = ["-m", "park_studio.server", "serve", "--host", "127.0.0.1", "--port", "\(activePort)"]
        var env = ProcessInfo.processInfo.environment
        if fm.fileExists(atPath: resSrc) {
            env["PYTHONPATH"] = resSrc
        } else if !envSrc.isEmpty && fm.fileExists(atPath: envSrc) {
            env["PYTHONPATH"] = envSrc
        }
        env["PYTHONUNBUFFERED"] = "1"
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
        proc.environment = env

        fm.createFile(atPath: desktopLogURL.path, contents: nil)
        if let fh = try? FileHandle(forWritingTo: desktopLogURL) {
            fh.seekToEndOfFile()
            let stamp = "\n=== Park Studio start (port=\(activePort), py=\(pyBin)) ===\n"
            fh.write(Data(stamp.utf8))
            proc.standardOutput = fh
            proc.standardError = fh
        }
        do {
            try proc.run()
            serverProcess = proc
        } catch {
            webView.loadHTMLString(errorHTML(title: "Park Studio 启动失败", detail: error.localizedDescription), baseURL: nil)
        }
    }

    private func bootstrapManagedVenv() {
        if isBootstrappingVenv { return }
        isBootstrappingVenv = true
        webView.loadHTMLString(loadingHTML(subtitle: "正在自动创建隔离环境 ~/.park-studio/venv 并安装 4 个轻量依赖（约 15 秒）…"), baseURL: nil)

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let basePy = self.pythonCandidates().first { $0 != self.managedVenvPython }
            guard let py = basePy else {
                DispatchQueue.main.async {
                    self.isBootstrappingVenv = false
                    self.webView.loadHTMLString(self.errorHTML(title: "未检测到 Python 3", detail: "请先安装 Python 3.11+（例如 brew install python 或从 python.org 下载），再点击重试。"), baseURL: nil)
                }
                return
            }

            let venvDir = self.dataDirURL.appendingPathComponent("venv").path
            let logFH = try? FileHandle(forWritingTo: self.desktopLogURL)
            if logFH == nil { FileManager.default.createFile(atPath: self.desktopLogURL.path, contents: nil) }
            let outFH = try? FileHandle(forWritingTo: self.desktopLogURL)
            outFH?.seekToEndOfFile()

            func runStep(_ bin: String, _ args: [String]) -> Int32 {
                let p = Process()
                p.executableURL = URL(fileURLWithPath: bin)
                p.arguments = args
                if let outFH { p.standardOutput = outFH; p.standardError = outFH }
                do {
                    try p.run()
                    p.waitUntilExit()
                    return p.terminationStatus
                } catch {
                    return -1
                }
            }

            let rc1 = runStep(py, ["-m", "venv", venvDir])
            let pipBin = self.dataDirURL.appendingPathComponent("venv/bin/pip").path
            let rc2 = (rc1 == 0) ? runStep(pipBin, ["install", "--quiet", "fastapi>=0.110", "uvicorn>=0.29", "pyyaml>=6.0", "httpx>=0.27", "websockets>=12.0"]) : rc1

            DispatchQueue.main.async {
                self.isBootstrappingVenv = false
                if rc1 == 0 && rc2 == 0 {
                    self.ensureBackendAndLoad()
                } else {
                    self.webView.loadHTMLString(self.errorHTML(title: "自动初始化运行环境失败", detail: self.tailDesktopLog()), baseURL: nil)
                }
            }
        }
    }

    private func tailDesktopLog() -> String {
        guard let txt = try? String(contentsOf: desktopLogURL, encoding: .utf8) else { return "暂无日志" }
        let lines = txt.split(separator: "\n", omittingEmptySubsequences: false).suffix(18)
        return lines.joined(separator: "\n")
    }

    private func pollUntilReady(attemptsLeft: Int) {
        if attemptsLeft <= 0 {
            webView.loadHTMLString(errorHTML(title: "本地服务未响应 (:\(activePort))", detail: tailDesktopLog()), baseURL: nil)
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            guard let self else { return }
            self.checkParkStudioHealth(port: self.activePort) { ok in
                if ok {
                    self.webView.load(URLRequest(url: self.baseURL))
                } else {
                    self.pollUntilReady(attemptsLeft: attemptsLeft - 1)
                }
            }
        }
    }

    // MARK: - WKUIDelegate

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.canChooseFiles = true
        panel.beginSheetModal(for: window) { response in
            completionHandler(response == .OK ? panel.urls : nil)
        }
    }

    // MARK: - Built-in Status & Bootstrap Pages

    private func loadingHTML(subtitle: String) -> String {
        """
        <!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;
        background:#111214;font-family:-apple-system,'PingFang SC',sans-serif;color:#F2F3F5">
        <div style="text-align:center;max-width:460px;padding:24px">
          <div style="font-size:21px;font-weight:700;letter-spacing:-.02em">Park Studio</div>
          <div style="margin-top:10px;font-size:13.5px;color:#9BA1A6;line-height:1.6">\(subtitle)</div>
        </div></body></html>
        """
    }

    private func setupNeededHTML() -> String {
        """
        <!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;
        background:#111214;font-family:-apple-system,'PingFang SC',sans-serif;color:#F2F3F5">
        <div style="max-width:480px;padding:32px;border-radius:16px;background:#1A1C1F;border:1px solid rgba(255,255,255,.08)">
          <h2 style="margin:0 0 8px;font-size:19px">首次启动 · 初始化本地运行环境</h2>
          <p style="margin:0 0 18px;font-size:13.5px;color:#9BA1A6;line-height:1.65">
            未在本机 Python 中检测到 Park Studio 所需的 4 个轻量本地依赖（<code>fastapi</code>、<code>uvicorn</code>、<code>pyyaml</code>、<code>httpx</code>）。
            点击下方按钮自动在 <code>~/.park-studio/venv</code> 隔离安装，无需打开终端，也不会污染系统 Python。
          </p>
          <div style="display:flex;gap:10px">
            <button onclick="window.webkit.messageHandlers.parkStudio.postMessage({action:'bootstrapVenv'})"
              style="padding:10px 18px;border:0;border-radius:10px;background:#5E6AD2;color:#fff;font-size:13.5px;font-weight:600;cursor:pointer">
              一键自动初始化环境（约 15 秒）
            </button>
            <button onclick="window.webkit.messageHandlers.parkStudio.postMessage({action:'retryStart'})"
              style="padding:10px 14px;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:transparent;color:#F2F3F5;font-size:13px;cursor:pointer">
              重新检测
            </button>
          </div>
        </div></body></html>
        """
    }

    private func errorHTML(title: String, detail: String) -> String {
        let escaped = detail
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        return """
        <!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;
        background:#111214;font-family:-apple-system,'PingFang SC',sans-serif;color:#F2F3F5">
        <div style="max-width:560px;width:90%;padding:28px;border-radius:16px;background:#1A1C1F;border:1px solid rgba(255,255,255,.08)">
          <h2 style="margin:0 0 10px;font-size:18px">\(title)</h2>
          <pre style="margin:0 0 16px;padding:12px;border-radius:10px;background:#0D0E10;color:#D0D4DA;font-size:11.5px;max-height:220px;overflow:auto;white-space:pre-wrap">\(escaped)</pre>
          <div style="display:flex;gap:10px">
            <button onclick="window.webkit.messageHandlers.parkStudio.postMessage({action:'bootstrapVenv'})"
              style="padding:9px 15px;border:0;border-radius:9px;background:#5E6AD2;color:#fff;font-size:13px;font-weight:600;cursor:pointer">自动修复环境</button>
            <button onclick="window.webkit.messageHandlers.parkStudio.postMessage({action:'retryStart'})"
              style="padding:9px 14px;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:transparent;color:#F2F3F5;font-size:13px;cursor:pointer">重试启动</button>
            <button onclick="window.webkit.messageHandlers.parkStudio.postMessage({action:'openLog'})"
              style="padding:9px 14px;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:transparent;color:#9BA1A6;font-size:13px;cursor:pointer">打开日志</button>
          </div>
        </div></body></html>
        """
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = ParkStudioDelegate()
app.delegate = delegate
app.run()
