import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.thariwealth.smartsuite',
  appName: 'ثري — THARI',
  webDir: 'dist',
  backgroundColor: '#0A0D10',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
      backgroundColor: '#0A0D10'
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0A0D10',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true
    },
    Haptics: {
      enabled: true
    }
  },
  ios: {
    backgroundColor: '#0A0D10',
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'thariapp',
    limitsNavigationsToAppBoundDomains: true
  },
  android: {
    backgroundColor: '#0A0D10',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
