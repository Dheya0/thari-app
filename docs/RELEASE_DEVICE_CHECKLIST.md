# THARI Financial Application — Physical Device Release Acceptance Checklist

**Document Version:** 1.2.0  
**Application Target:** THARI Mobile (iOS & Android)  
**Status Policy:** `CODE READY` ≠ `DEVICE VERIFIED` ≠ `STORE READY`  
> ⚠️ **Verification Gate Rule:** Automated CI (`npm run lint`, `npm test`, `npm run build`) verifies code correctness and logical invariants. Under no circumstances may a build be marked `STORE READY` without completing physical hardware testing on actual iOS and Android devices.

---

## 1. Release Identification Header

| Field | Value / Entry |
| :--- | :--- |
| **App Name** | THARI (ثـري) |
| **Release Version** | `1.2.0` |
| **Build Number** | `22` |
| **Date Tested** | `2026-09-01` |
| **Target Platforms** | Android (APK / AAB) & iOS (IPA / TestFlight) |
| **Lead Tester** | Dheya / QA Release Team |
| **Overall Gate Decision** | `RELEASE CANDIDATE — PHYSICAL DEVICE VERIFICATION REQUIRED` |

---

## 2. Platform Acceptance Test Matrix

### Legend
- `PASS`: Verified successfully on physical hardware.
- `FAIL`: Regression or blocking issue found on physical hardware.
- `NOT VERIFIED`: Awaiting physical device run (e.g. simulator/web only).

---

### A. Android Physical Device Matrix (Tested on Physical Hardware)

| Test ID | Test Category & Item | Expected Behavior | Verification Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **AND-01** | **Fresh Installation & Launch** | Clean install of signed Release APK/AAB; splash screen animates smoothly, loads root dashboard within 2.0s without crashes. | `NOT VERIFIED` | Requires physical device run |
| **AND-02** | **Upgrade from Previous Build** | Updating from v1.1.x/v1.2.0-rc: All existing transactions, custom categories, wallets, exchange rates, and receipts are preserved intact. | `NOT VERIFIED` | Requires physical device run |
| **AND-03** | **System Hardware Back Key** | Pressing physical/gesture Back navigates back 1 level in nested screens/wizards/modals without double-popping or accidental app termination. | `NOT VERIFIED` | Requires physical device run |
| **AND-04** | **Software Keyboard Handling** | Opening transaction form adjusts viewport; typing Arabic/Persian digits parses correctly; Back key closes keyboard first. | `NOT VERIFIED` | Requires physical device run |
| **AND-05** | **Biometric Authentication** | Fingerprint / Face Unlock activates on app launch and resumes from background; fallback to master PIN works cleanly. | `NOT VERIFIED` | Requires physical device run |
| **AND-06** | **Offline Transaction Persistence** | Transactions added offline persist across app backgrounding, task killing, and device restart. | `NOT VERIFIED` | Requires physical device run |
| **AND-07** | **Receipt Capture & Camera** | Attaching camera photo compresses image, stores securely in private app storage, and displays cleanly. | `NOT VERIFIED` | Requires physical device run |
| **AND-08** | **PDF Export & Share Sheet** | Generating monthly financial PDF opens native Android share sheet with single tap; no duplicate share sheets. | `NOT VERIFIED` | Requires physical device run |
| **AND-09** | **Encrypted Backup & Restore** | Exporting AES-256-GCM backup and restoring on another Android device validates checksum and restores complete ledger. | `NOT VERIFIED` | Requires physical device run |

---

### B. iOS Physical Device Matrix (Tested on Physical Hardware / TestFlight)

| Test ID | Test Category & Item | Expected Behavior | Verification Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **IOS-01** | **TestFlight Install & Launch** | Signed TestFlight build installs, requests required permissions on demand, renders safely within Notch/Dynamic Island. | `NOT VERIFIED` | Requires physical device run |
| **IOS-02** | **Upgrade from Previous Build** | Seamless upgrade; Keychain credentials preserved; Core Ledger balances remain mathematically identical. | `NOT VERIFIED` | Requires physical device run |
| **IOS-03** | **Face ID / Touch ID Auth** | Native Biometric prompt displays with Arabic/English localization; fails closed on cancel; handles biometric enrollment changes. | `NOT VERIFIED` | Requires physical device run |
| **IOS-04** | **Visible Back & Gesture** | Visible header `[ ← ]` button and RTL/LTR arrows accurately step back one level in forms, sub-settings, and reports. | `NOT VERIFIED` | Requires physical device run |
| **IOS-05** | **Keyboard Resizing & Safe Area** | Virtual keyboard does not conceal input fields or action buttons on iOS 17/18+. | `NOT VERIFIED` | Requires physical device run |
| **IOS-06** | **Cross-Currency & Local Dates** | Preserves historical FX rates on multi-currency transactions; local calendar reflects device time without UTC drift. | `NOT VERIFIED` | Requires physical device run |
| **IOS-07** | **PDF Print & iOS Share Sheet** | AirPrint and UIActivityViewController trigger single instance; cancellation returns cleanly to report preview. | `NOT VERIFIED` | Requires physical device run |
| **IOS-08** | **App Kill & Background Resume** | Active state saved to encrypted storage before suspension; zero data loss upon OS memory purge. | `NOT VERIFIED` | Requires physical device run |

---

## 3. Data Integrity & Smoke Verification Protocols

### Protocol 1: Crash & Cold Restart Smoke Test
1. Add a multi-currency transaction with an attached receipt.
2. Verify balance update on the main dashboard.
3. Send app to background and force-kill the process.
4. Launch app and verify transaction, receipt thumbnail, and wallet balances are exact.

### Protocol 2: End-to-End Backup Verification
1. Navigate to `Settings` → `Backup & Security`.
2. Generate an encrypted backup file with a strong passphrase.
3. Clear application data or perform clean reinstall.
4. Restore using the encrypted backup file and verify 100% data recovery.

---

## 4. Release Status Definitions

```
[ CODE READY ]
  ↳ All automated linting (tsc), regression tests (npm test), and production builds (npm run build) pass 100%.

[ RELEASE CANDIDATE — PHYSICAL DEVICE VERIFICATION REQUIRED ]
  ↳ Code is verified in automated CI and Web container; awaiting testing on physical iOS and Android hardware.

[ STORE READY ]
  ↳ All items in Android & iOS Physical Device matrices above are verified on actual physical devices with PASS status.
```
