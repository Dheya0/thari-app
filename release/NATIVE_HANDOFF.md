# THARI (ثـــري) — NATIVE HANDOFF DOCUMENTATION
## Version: v1.2.0-rc1 | Build Number: 2026.08.101 | Status: Release Candidate

---

## 1. Executive Platform Status Summary

```text
WEB PLATFORM:               ✅ VERIFIED (tsc --noEmit, vite build, zero errors)
PWA PLATFORM:               ✅ VERIFIED (ServiceWorker, offline caching, manifest)
CORE FINANCIAL ENGINE:      ✅ VERIFIED (Double-entry, zero drift, 100k tx benchmarked)
SECURITY & PBKDF2 CORE:     ✅ VERIFIED (OWASP 600,000 iterations, AES-256-GCM)
FINANCIAL REPORTS ENGINE:   ✅ VERIFIED (Summary, Detailed, PDF, CSV/Excel, QR)
OFFLINE LEDGER:             ✅ VERIFIED (100% autonomous client persistence)
CAPACITOR PROJECT:          ✅ PREPARED (Assets synced, configs aligned)
ANDROID NATIVE:             🟡 PREPARED — NOT DEVICE VERIFIED (Requires Android Studio / JDK)
IOS NATIVE:                 🟡 PREPARED — NOT DEVICE VERIFIED (Requires macOS / Xcode)
```

---

## 2. Native Plugin Inventory & Abstraction Matrix

All native device features are strictly isolated behind safe service bridges with zero runtime crashing when run in standard Web browsers or PWAs.

| Plugin Package | Web / PWA | Android Native | iOS Native | Purpose & Abstraction | Verification State |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `@capacitor/core` | Bridge | Native Runtime | Native Runtime | Platform detection & bridge foundation | **VERIFIED** |
| `@capacitor/app` | Visibility API | Native Lifecycle | Native Lifecycle | Back button, background lock, app exit | **PREPARED / PENDING DEVICE** |
| `@aparajita/capacitor-biometric-auth` | WebAuthn Fallback | BiometricPrompt | LocalAuthentication (Face ID/Touch ID) | Biometric key guard & app unlock | **PREPARED / PENDING DEVICE** |
| `@capacitor/filesystem` | Blob / Download | App Sandboxed Storage | App Documents Directory | Encrypted backup import/export | **PREPARED / PENDING DEVICE** |
| `@capacitor/share` | WebShare API | Android Intent Share | UIActivityViewController | Direct report & backup sharing | **PREPARED / PENDING DEVICE** |
| `@capacitor/keyboard` | VisualViewport | Window Soft Input | Keyboard Insets | Scroll active input into view | **PREPARED / PENDING DEVICE** |
| `@capacitor/status-bar` | Theme-color meta | Window Insets | Status Bar Overlay | Seamless dark status bar overlay | **PREPARED / PENDING DEVICE** |
| `@capacitor/haptics` | navigator.vibrate | Vibrator / Haptic | Taptic Engine | Keypad & success haptic feedback | **PREPARED / PENDING DEVICE** |

---

## 3. Android Setup & Verification Procedure

### A. Prerequisites on Workstation
* **Operating System:** Linux, macOS, or Windows
* **JDK:** OpenJDK 17 LTS
* **Android Studio:** Android Studio Hedgehog / Ladybug or newer
* **Android SDK:** Platforms 24 to 34+ (API 34/35)

### B. Execution Sequence
```bash
# 1. Clone repository on local workstation
git clone <repository_url>
cd thari-app

# 2. Install dependencies & build Web bundle
npm install
npm run build

# 3. Synchronize Web assets with Android native workspace
npx cap sync android

# 4. Open native project in Android Studio
npx cap open android
```

### C. Android Studio Verification Checklist
1. **Sync Gradle:** Verify that Gradle 8.4+ finishes sync with 0 errors.
2. **Build Configuration Check:**
   - `applicationId`: `com.thari.finance.app`
   - `minSdkVersion`: `24`
   - `targetSdkVersion`: `34` (or `35`)
   - `versionCode`: `10200`
   - `versionName`: `1.2.0`
3. **App Privacy Screen (`FLAG_SECURE`):**
   In `android/app/src/main/java/com/thari/finance/app/MainActivity.java`, verify:
   ```java
   package com.thari.finance.app;
   import android.os.Bundle;
   import android.view.WindowManager;
   import com.getcapacitor.BridgeActivity;

   public class MainActivity extends BridgeActivity {
       @Override
       public void onCreate(Bundle savedInstanceState) {
           super.onCreate(savedInstanceState);
           // Prevent financial data leakage in App Switcher snapshots
           getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
       }
   }
   ```
4. **Generate Release Bundle:**
   Navigate to `Build` ➔ `Generate Signed Bundle / APK` ➔ `Android App Bundle (.aab)` using your production keystore.
5. **Physical Device Smoke Test:**
   - Install APK/AAB on physical Android 10+ device.
   - Test BiometricPrompt (Fingerprint / Face Unlock).
   - Test Hardware Back Button: Verify dialogs close first, then navigation pops, then app exits from Dashboard.
   - Test Keyboard: Verify transaction amount inputs do not get obscured by soft keyboard.

---

## 4. iOS Setup & Verification Procedure

### A. Prerequisites on Workstation
* **Operating System:** macOS Sonoma (14.x) or Sequoia (15.x)
* **Xcode:** Xcode 15.4 or Xcode 16.x
* **CocoaPods:** 1.15.x+
* **Apple Developer Account:** Configured with valid Signing Team & Provisioning Profiles.

### B. Execution Sequence
```bash
# 1. Install & build on macOS machine
npm install
npm run build

# 2. Sync Web assets with iOS project
npx cap sync ios

# 3. Open project in Xcode
npx cap open ios
```

### C. Xcode Verification Checklist
1. **Bundle Identifier:** `com.thari.finance.app`
2. **Version & Build:** Version `1.2.0`, Build `10200`
3. **Permissions in `Info.plist`:**
   - `NSFaceIDUsageDescription`: `يتطلب تطبيق ثري إذن Face ID لتأمين وحماية سجلاتك المالية.`
   - `NSCameraUsageDescription`: `يتطلب تطبيق ثري إذن الكاميرا لمسح الفواتير ورموز الاستجابة السريعة.`
   - `NSPhotoLibraryUsageDescription`: `يتطلب تطبيق ثري الوصول لمكتبة الصور لحفظ واستيراد النسخ الاحتياطية.`
4. **Safe Area Insets:**
   - Test on iPhone with Dynamic Island (iPhone 14 Pro / 15 / 16) and iPhone with Home Bar.
   - Verify `--sat: env(safe-area-inset-top)` and `--sab: env(safe-area-inset-bottom)` ensure headers and bottom navigation bars never overlap native hardware areas.
5. **Build & Archive:**
   - Select `Any iOS Device (arm64)` ➔ `Product` ➔ `Archive`.
   - Validate Archive against App Store Connect requirements.

---

## 5. Security & Threat Model Disclosure

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ASSURANCE BOUNDARY                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Local Cryptographic Isolation:                                      │
│    • PIN hashes use OWASP PBKDF2-HMAC-SHA256 with 600,000 iterations.  │
│    • Backups use authenticated AES-256-GCM encryption with 12-byte IVs.│
│                                                                        │
│ 2. Client-Side Threat Model:                                           │
│    • The application operates in zero-knowledge mode without backdoors. │
│    • Forgotten master passwords cannot be recovered.                   │
│    • Optional user-provided AI keys are stored locally encrypted.      │
│                                                                        │
│ 3. Privacy & Tracking:                                                 │
│    • Zero analytics, zero ad networks, zero third-party telemetry.     │
│    • Financial calculations execute 100% locally on the device CPU.    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Verification Status Confirmation

This package is officially ready for native compilation and device testing by the deployment engineer.

**Deliverables Included:**
1. Clean, verified Web application distribution in `/dist`
2. Configured Capacitor manifest in `/capacitor.config.json`
3. Native service bridges with fallback support in `/services/`
4. Release candidate manifest in `/release/RELEASE_MANIFEST.md`
5. Native handoff guide in `/release/NATIVE_HANDOFF.md`
