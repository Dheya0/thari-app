#!/usr/bin/env bash
set -euo pipefail
echo "===== Thari: Install native secure plugins (Unix/macOS) ====="

echo "1) Install community secure storage and keychain (may require network access)"
npm install @capacitor-community/secure-storage --save || echo "install @capacitor-community/secure-storage failed"
npm install @capacitor/keychain --save || echo "install @capacitor/keychain failed"

echo "2) Capacitor sync"
npx cap sync || echo "cap sync failed"

if [ -d ios ]; then
  echo "3) iOS: run pod install"
  (cd ios && pod install) || echo "pod install failed - run it on macOS with cocoapods installed"
fi

echo "Done. Then build: npm run build && npx cap open android || npx cap open ios"
