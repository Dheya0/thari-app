import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private let thariDarkColor = UIColor(red: 10.0 / 255.0, green: 13.0 / 255.0, blue: 16.0 / 255.0, alpha: 1.0)

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        applyDarkNativeStyling()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        applyDarkNativeStyling()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        applyDarkNativeStyling()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func applyDarkNativeStyling() {
        window?.backgroundColor = thariDarkColor
        if let rootVC = window?.rootViewController as? CAPBridgeViewController {
            rootVC.view.backgroundColor = thariDarkColor
            if let webView = rootVC.webView {
                webView.isOpaque = false
                webView.backgroundColor = thariDarkColor
                webView.scrollView.backgroundColor = thariDarkColor
                webView.scrollView.bounces = false
                webView.scrollView.showsVerticalScrollIndicator = false
                webView.scrollView.showsHorizontalScrollIndicator = false
                webView.scrollView.contentInsetAdjustmentBehavior = .never
            }
        }
    }
}
