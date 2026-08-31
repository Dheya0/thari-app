import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

export type LifecycleEventType = 'APP_FOREGROUND' | 'APP_BACKGROUND' | 'DEEP_LINK' | 'QUICK_ACTION';

type LifecycleListener = (event: LifecycleEventType, payload?: any) => void;

class AppLifecycleService {
  private listeners: Set<LifecycleListener> = new Set();
  private initialized = false;
  private lastState: 'foreground' | 'background' | null = null;
  private lastUrlProcessed: string | null = null;
  private lastQuickActionProcessed: string | null = null;
  private cleanupFns: Array<() => void> = [];

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // Check initial URL / Quick Action on startup (idempotent)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const action = urlParams.get('action') || urlParams.get('quick-add') || urlParams.get('quickAdd') || (hash.includes('quick-add') || hash.includes('quick_add') ? 'quick-add' : null);
      if (action && action !== this.lastQuickActionProcessed) {
        this.lastQuickActionProcessed = action;
        this.emit('QUICK_ACTION', action);
      }
      if (window.location.href && window.location.href !== this.lastUrlProcessed) {
        this.lastUrlProcessed = window.location.href;
        this.emit('DEEP_LINK', window.location.href);
      }
    } catch (e) {}

    // 1. Capacitor App State Change & URL Open (iOS / Android)
    if (Capacitor.isNativePlatform() || isCapacitorAvailable()) {
      try {
        CapApp.addListener('appStateChange', (state) => {
          const isForeground = state.isActive;
          if (isForeground && this.lastState !== 'foreground') {
            this.lastState = 'foreground';
            this.emit('APP_FOREGROUND');
          } else if (!isForeground && this.lastState !== 'background') {
            this.lastState = 'background';
            this.emit('APP_BACKGROUND');
          }
        }).then(handle => {
          this.cleanupFns.push(() => handle.remove());
        });

        CapApp.addListener('appUrlOpen', (data) => {
          if (data && data.url && data.url !== this.lastUrlProcessed) {
            this.lastUrlProcessed = data.url;
            this.emit('DEEP_LINK', data.url);
            if ((data.url.includes('quick') || data.url.includes('add') || data.url.includes('action=quick')) && data.url !== this.lastQuickActionProcessed) {
              this.lastQuickActionProcessed = data.url;
              this.emit('QUICK_ACTION', data.url);
            }
          }
        }).then(handle => {
          this.cleanupFns.push(() => handle.remove());
        });
      } catch (e) {}
    }

    // 2. Web / PWA Document Visibility, Focus, Pagehide, Pageshow, Popstate, Hashchange (Normalized to ONE transition event)
    const handleBackground = () => {
      if (this.lastState !== 'background') {
        this.lastState = 'background';
        this.emit('APP_BACKGROUND');
      }
    };

    const handleForeground = () => {
      if (this.lastState !== 'foreground') {
        this.lastState = 'foreground';
        this.emit('APP_FOREGROUND');
        this.checkUrlActions();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleBackground();
      } else {
        handleForeground();
      }
    };

    const handleFocus = () => {
      handleForeground();
    };

    const handlePageHide = () => {
      handleBackground();
    };

    const handlePageShow = () => {
      handleForeground();
    };

    const handlePopStateOrHash = () => {
      this.checkUrlActions();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopStateOrHash);
    window.addEventListener('hashchange', handlePopStateOrHash);

    this.cleanupFns.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopStateOrHash);
      window.removeEventListener('hashchange', handlePopStateOrHash);
    });
  }

  private checkUrlActions() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const action = urlParams.get('action') || urlParams.get('quick-add') || urlParams.get('quickAdd') || (hash.includes('quick-add') || hash.includes('quick_add') ? 'quick-add' : null);
      if (action && action !== this.lastQuickActionProcessed) {
        this.lastQuickActionProcessed = action;
        this.emit('QUICK_ACTION', action);
      }
      if (window.location.href && window.location.href !== this.lastUrlProcessed) {
        this.lastUrlProcessed = window.location.href;
        this.emit('DEEP_LINK', window.location.href);
      }
    } catch (e) {}
  }

  public addListener(listener: LifecycleListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: LifecycleEventType, payload?: any) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (e) {
        console.error('Lifecycle listener error:', e);
      }
    }
  }

  public destroy() {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
    this.listeners.clear();
    this.initialized = false;
  }
}

function isCapacitorAvailable() {
  try {
    return !!Capacitor.isPluginAvailable('App');
  } catch {
    return false;
  }
}

export const appLifecycleService = new AppLifecycleService();
