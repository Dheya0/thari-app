/**
 * THARI Financial Application — Unified Native Abstraction Layer
 * Isolates platform-specific capabilities (Storage, Biometrics, Camera, File, Share)
 * for seamless portability across Web, iOS (Capacitor/Swift), and Android.
 */

import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface INativeStorageService {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface INativeBiometricService {
  isAvailable(): Promise<boolean>;
  authenticate(reason: string): Promise<{ success: boolean; error?: string }>;
}

export interface INativeFileService {
  downloadFile(fileName: string, mimeType: string, content: string | Blob): Promise<boolean>;
  pickFile(accept: string): Promise<{ fileName: string; content: string; mimeType: string } | null>;
}

export interface INativeShareService {
  canShare(): boolean;
  share(title: string, text: string, url?: string): Promise<boolean>;
}

export interface KeyboardInfo {
  keyboardHeight: number;
}

export interface INativeKeyboardService {
  isAvailable(): boolean;
  hide(): Promise<void>;
  show(): Promise<void>;
  setAccessoryBarVisible(isVisible: boolean): Promise<void>;
  setStyle(style: 'DARK' | 'LIGHT' | 'DEFAULT'): Promise<void>;
  setResizeMode(mode: 'body' | 'ionic' | 'native' | 'none'): Promise<void>;
  addListener(
    eventName: 'keyboardWillShow' | 'keyboardDidShow' | 'keyboardWillHide' | 'keyboardDidHide',
    listenerFunc: (info: KeyboardInfo) => void
  ): Promise<PluginListenerHandle | { remove: () => void }>;
}

// 1. Web / Capacitor Hybrid Storage Bridge
export const NativeStorage: INativeStorageService = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('NativeStorage setItem failed:', e);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('NativeStorage removeItem failed:', e);
    }
  },
  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('NativeStorage clear failed:', e);
    }
  },
};

// 2. Biometric Authentication Bridge
export const NativeBiometrics: INativeBiometricService = {
  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    // Check for WebAuthn / PublicKeyCredential support
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      try {
        return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }
    return false;
  },

  async authenticate(reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return { success: false, error: 'المصادقة البيومترية غير مدعومة على هذا الجهاز' };
      }

      // Generate a client challenge for WebAuthn platform authenticator
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname || 'localhost',
        },
      });

      if (credential) {
        return { success: true };
      }
      return { success: false, error: 'تم إلغاء المصادقة أو فشلها' };
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        return { success: false, error: 'تم إلغاء المصادقة البيومترية من قبل المستخدم' };
      }
      return { success: false, error: e.message || 'فشلت المصادقة البيومترية' };
    }
  },
};

// 3. File System & Download Bridge
export const NativeFiles: INativeFileService = {
  async downloadFile(fileName: string, mimeType: string, content: string | Blob): Promise<boolean> {
    try {
      const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (e) {
      console.error('NativeFiles download failed:', e);
      return false;
    }
  },

  async pickFile(accept: string): Promise<{ fileName: string; content: string; mimeType: string } | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            fileName: file.name,
            content: reader.result as string,
            mimeType: file.type || 'application/octet-stream',
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  },
};

// 4. Native Share Bridge
export const NativeShare: INativeShareService = {
  canShare(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  },

  async share(title: string, text: string, url?: string): Promise<boolean> {
    if (this.canShare()) {
      try {
        await navigator.share({ title, text, url: url || window.location.href });
        return true;
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('NativeShare error:', e);
        }
        return false;
      }
    }
    return false;
  },
};

export interface INativeHapticsService {
  isAvailable(): boolean;
  impact(style?: 'LIGHT' | 'MEDIUM' | 'HEAVY'): Promise<void>;
  selection(): Promise<void>;
  notification(type?: 'SUCCESS' | 'WARNING' | 'ERROR'): Promise<void>;
  vibrate(durationMs?: number): Promise<void>;
}

// 5. Capacitor Native Keyboard Bridge
export const NativeKeyboard: INativeKeyboardService = {
  isAvailable(): boolean {
    return Capacitor.isPluginAvailable('Keyboard') || Capacitor.isNativePlatform();
  },

  async hide(): Promise<void> {
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    if (this.isAvailable()) {
      try {
        await Keyboard.hide();
      } catch {
        // Fallback handled by document.activeElement.blur()
      }
    }
  },

  async show(): Promise<void> {
    if (this.isAvailable()) {
      try {
        await Keyboard.show();
      } catch {
        // Ignored
      }
    }
  },

  async setAccessoryBarVisible(isVisible: boolean): Promise<void> {
    if (this.isAvailable()) {
      try {
        await Keyboard.setAccessoryBarVisible({ isVisible });
      } catch {
        // Ignored
      }
    }
  },

  async setStyle(style: 'DARK' | 'LIGHT' | 'DEFAULT'): Promise<void> {
    if (this.isAvailable()) {
      try {
        const mappedStyle = style === 'LIGHT' ? KeyboardStyle.Light : style === 'DEFAULT' ? KeyboardStyle.Default : KeyboardStyle.Dark;
        await Keyboard.setStyle({ style: mappedStyle });
      } catch {
        // Ignored
      }
    }
  },

  async setResizeMode(mode: 'body' | 'ionic' | 'native' | 'none'): Promise<void> {
    if (this.isAvailable()) {
      try {
        const mappedMode = mode === 'native' ? KeyboardResize.Native : mode === 'ionic' ? KeyboardResize.Ionic : mode === 'none' ? KeyboardResize.None : KeyboardResize.Body;
        await Keyboard.setResizeMode({ mode: mappedMode });
      } catch {
        // Ignored
      }
    }
  },

  async addListener(
    eventName: 'keyboardWillShow' | 'keyboardDidShow' | 'keyboardWillHide' | 'keyboardDidHide',
    listenerFunc: (info: KeyboardInfo) => void
  ): Promise<PluginListenerHandle | { remove: () => void }> {
    if (this.isAvailable()) {
      try {
        return await (Keyboard.addListener as any)(eventName, (info: any) => {
          listenerFunc({ keyboardHeight: info?.keyboardHeight || 0 });
        });
      } catch {
        return { remove: () => {} };
      }
    }
    return { remove: () => {} };
  },
};

// 6. Capacitor Native & Web Haptics Bridge
export const NativeHaptics: INativeHapticsService = {
  isAvailable(): boolean {
    return Capacitor.isPluginAvailable('Haptics') || (typeof navigator !== 'undefined' && 'vibrate' in navigator);
  },

  async impact(style: 'LIGHT' | 'MEDIUM' | 'HEAVY' = 'LIGHT'): Promise<void> {
    if (Capacitor.isPluginAvailable('Haptics')) {
      try {
        const mapped = style === 'HEAVY' ? ImpactStyle.Heavy : style === 'MEDIUM' ? ImpactStyle.Medium : ImpactStyle.Light;
        await Haptics.impact({ style: mapped });
        return;
      } catch {}
    }
    // Web Fallback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(style === 'HEAVY' ? 24 : style === 'MEDIUM' ? 14 : 8);
      } catch {}
    }
  },

  async selection(): Promise<void> {
    if (Capacitor.isPluginAvailable('Haptics')) {
      try {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        return;
      } catch {}
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(6);
      } catch {}
    }
  },

  async notification(type: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS'): Promise<void> {
    if (Capacitor.isPluginAvailable('Haptics')) {
      try {
        const mapped = type === 'ERROR' ? NotificationType.Error : type === 'WARNING' ? NotificationType.Warning : NotificationType.Success;
        await Haptics.notification({ type: mapped });
        return;
      } catch {}
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(type === 'ERROR' ? [20, 50, 20] : type === 'WARNING' ? [15, 30] : 15);
      } catch {}
    }
  },

  async vibrate(durationMs = 15): Promise<void> {
    if (Capacitor.isPluginAvailable('Haptics')) {
      try {
        await Haptics.vibrate({ duration: durationMs });
        return;
      } catch {}
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(durationMs);
      } catch {}
    }
  },
};

