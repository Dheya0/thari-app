// helper script to guide native secure setup (non-destructive)
console.log('Thari: prepare_native_secure - helper');
console.log('This repository includes secureStorage dynamic support.');
console.log('Run the following commands locally (one-by-one) to install native secure plugins:');
console.log('  npm install @capacitor-community/secure-storage --save || echo install failed');
console.log('  npm install @capacitor/keychain --save || echo install failed');
console.log('  npx cap sync');
console.log('  (mac) cd ios && pod install');
console.log('Then build and test on devices:');
console.log('  npm run build && npx cap open android || npx cap open ios');
console.log('\nIf your environment blocks npm access, install the plugin packages from their git URLs or use an enterprise registry.');
