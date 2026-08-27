@echo off
echo ===== Thari: Install native secure plugins (Windows) =====
echo 1) Install community secure storage (if available) and keychain
npm install @capacitor-community/secure-storage --save || echo "install @capacitor-community/secure-storage failed"
npm install @capacitor/keychain --save || echo "install @capacitor/keychain failed"

echo 2) Capacitor sync
npx cap sync || echo "cap sync failed"
echo 3) Copy web assets into native projects (already handled by cap sync)
echo Note: For iOS you must run 'pod install' from macOS inside ios/ folder.
echo Done. Please review output and then run: npm run build && npx cap open android (or cap open ios on mac).
pause
