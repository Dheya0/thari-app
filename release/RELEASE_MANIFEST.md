# THARI (ثـــري) — RELEASE CANDIDATE MANIFEST
## Version: v1.3.0 | Build Number: 130001 | Codename: Financial Sovereignty & Native Speed

---

## 1. System Metadata & Release Identity

| Property | Specification Value |
| :--- | :--- |
| **Product Name** | ثـــري — الإدارة المالية الشخصية والذكاء الدفتري (THARI Financial Suite) |
| **Application ID** | `com.thariwealth.smartsuite` |
| **Semantic Version** | `1.3.0` |
| **Release Candidate Tag** | `v1.3.0` (Git Release Tag) |
| **Build Code / Version Code** | `130001` |
| **Target Stores** | Google Play Store (AAB/APK) & Apple App Store (IPA / Unsigned IPA) & Web PWA |
| **Codemagic Workflows** | 1. `android-workflow` • 2. `ios-workflow` • 3. `ios-unsigned-workflow` |

---

## 2. Platform Build & Native Optimization Status

| Platform / Artifact | Verification Status | Native Optimizations Applied |
| :--- | :---: | :--- |
| **Web & Capacitor Assets** | **PASS (100%)** | Redesigned UI with clear buttons/icons, Reports UI removed, session-cached PBKDF2, GPU layer containment, `npx cap sync` completed. |
| **Android Release (`android-workflow`)** | **READY (100%)** | Hardware-accelerated WebView (`LAYER_TYPE_HARDWARE`), `OVER_SCROLL_NEVER` for zero swipe lag, `#0A0D10` native window/bars, 4GB parallel Gradle build. |
| **iOS App Store (`ios-workflow`)** | **READY (100%)** | 120Hz ProMotion unlocked (`CADisableMinimumFrameDurationOnPhone`), `#0A0D10` dark `WKWebView` background with bounce disabled (`AppDelegate.swift`). |
| **iOS Unsigned (`ios-unsigned-workflow`)** | **READY (100%)** | Ad-Hoc unsigned `Thari_unsigned_app.ipa` pipeline for Sideloadly / AltStore with full 120Hz & UI parity. |
