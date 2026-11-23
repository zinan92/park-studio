import Cocoa
import WebKit

final class ParkStudioDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var serverProcess: Process?
    private let port = 8792
    private var baseURL: URL { URL(string: "http://127.0.0.1:\(port)/")! }

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupMenus()
        setupWindow()
        ensureBackendAndLoad()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let proc = serverProcess, proc.isRunning {
            proc.terminate()
        }
    }

    private func setupWindow() {
        let rect = NSRect(x: 0, y: 0, width: 1380, height: 880)
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Park Studio"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = true
        window.backgroundColor = NSColor(calibratedRed: 0.945, green: 0.949, blue: 0.965, alpha: 1.0)
        window.minSize = NSSize(width: 960, height: 640)
        window.center()

        let cfg = WKWebViewConfiguration()
        cfg.applicationNameForUserAgent = "ParkStudioMacApp/1.0"
        cfg.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: window.contentView!.bounds, configuration: cfg)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        window.contentView?.addSubview(webView)

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

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

        // Edit menu (enables Cmd+C/V/X/A/Z in web inputs)
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
        viewMenu.addItem(withTitle: "后退", action: #selector(goBack), keyEquivalent: "[")
        viewMenu.addItem(withTitle: "前进", action: #selector(goForward), keyEquivalent: "]")
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
    @objc private func goBack() { if webView.canGoBack { webView.goBack() } }
    @objc private func goForward() { if webView.canGoForward { webView.goForward() } }

    private func healthCheck(_ completion: @escaping (Bool) -> Void) {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.connectionProxyDictionary = [:] // bypass macOS system proxy for 127.0.0.1
        cfg.timeoutIntervalForRequest = 1.2
        let session = URLSession(configuration: cfg)
        let url = URL(string: "http://127.0.0.1:\(port)/api/health")!
        session.dataTask(with: url) { _, resp, _ in
            let ok = (resp as? HTTPURLResponse)?.statusCode == 200
            DispatchQueue.main.async { completion(ok) }
        }.resume()
    }

    private func ensureBackendAndLoad() {
        healthCheck { [weak self] alive in
            guard let self else { return }
            if alive {
                self.webView.load(URLRequest(url: self.baseURL))
                return
            }
            self.webView.loadHTMLString(self.loadingHTML, baseURL: nil)
            self.startEmbeddedBackend()
            self.pollUntilReady(attemptsLeft: 25)
        }
    }

    private func startEmbeddedBackend() {
        let fm = FileManager.default
        let resSrc = Bundle.main.resourcePath.map { "\($0)/backend" } ?? ""
        let homeRepo = (NSHomeDirectory() as NSString).appendingPathComponent("work/park-studio/src")
        let pythonPath = fm.fileExists(atPath: resSrc) ? resSrc : homeRepo

        let pyCandidates = [
            "/usr/local/bin/python3",
            "/opt/homebrew/bin/python3",
            "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
            "/usr/bin/python3",
        ]
        let pyBin = pyCandidates.first { fm.isExecutableFile(atPath: $0) } ?? "/usr/bin/env"

        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: pyBin)
        var args = ["-m", "park_studio.server", "serve", "--host", "127.0.0.1", "--port", "\(port)"]
        if pyBin == "/usr/bin/env" { args.insert("python3", at: 0) }
        proc.arguments = args
        var env = ProcessInfo.processInfo.environment
        env["PYTHONPATH"] = pythonPath
        env["PYTHONUNBUFFERED"] = "1"
        proc.environment = env
        proc.standardOutput = FileHandle.nullDevice
        proc.standardError = FileHandle.nullDevice
        do {
            try proc.run()
            serverProcess = proc
        } catch {
            let msg = "无法启动本地 Python 服务：\(error.localizedDescription)"
            webView.loadHTMLString("<body style='font-family:-apple-system;padding:48px'><h2>Park Studio 启动失败</h2><p>\(msg)</p></body>", baseURL: nil)
        }
    }

    private func pollUntilReady(attemptsLeft: Int) {
        if attemptsLeft <= 0 {
            webView.loadHTMLString("<body style='font-family:-apple-system;padding:48px'><h2>本地服务未响应 (:8792)</h2><p>请确认已安装 python3 及 fastapi/uvicorn 依赖，然后按 ⌘R 重试。</p></body>", baseURL: nil)
            return
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            guard let self else { return }
            self.healthCheck { ok in
                if ok {
                    self.webView.load(URLRequest(url: self.baseURL))
                } else {
                    self.pollUntilReady(attemptsLeft: attemptsLeft - 1)
                }
            }
        }
    }

    // Open target="_blank" external links in default macOS browser
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

    // Native <input type="file"> support
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

    private var loadingHTML: String {
        """
        <!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;
        background:#F1F2F6;font-family:-apple-system,'PingFang SC',sans-serif;color:#121519">
        <div style="text-align:center"><div style="font-size:20px;font-weight:700">Park Studio</div>
        <div style="margin-top:8px;font-size:13px;color:#68717E">正在拉起本地内容中控服务…</div></div></body></html>
        """
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = ParkStudioDelegate()
app.delegate = delegate
app.run()
