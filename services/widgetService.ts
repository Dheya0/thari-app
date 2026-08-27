/**
 * THARI — Native Widget Synchronization Service
 * Synchronizes financial balances and summary data with iOS WidgetKit (App Groups / UserDefaults)
 * and Android App Widgets (SharedPreferences / Broadcasts) for real-time home screen updates.
 */

export interface WidgetData {
  totalBalance: number;
  availableBalance: number;
  currency: string;
  currencySymbol: string;
  lastUpdated: string;
  activeWalletsCount: number;
}

export const WidgetService = {
  async updateWidgetData(data: WidgetData): Promise<void> {
    try {
      // 1. Save to local storage for quick web/PWA widget fallback
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('thari_widget_cache', JSON.stringify(data));
      }

      // 2. Check for Capacitor native bridge / App Group sharing
      const win = window as any;
      if (win.Capacitor && win.Capacitor.Plugins) {
        const { Plugins } = win.Capacitor;
        
        // If a custom Capacitor NativeStorage or Widget plugin is registered
        if (Plugins.ThariWidgetPlugin && typeof Plugins.ThariWidgetPlugin.updateWidget === 'function') {
          await Plugins.ThariWidgetPlugin.updateWidget(data);
          return;
        }

        // Native iOS AppGroup / Android SharedPreferences fallback via Capacitor Preferences or bridge
        if (Plugins.Preferences) {
          await Plugins.Preferences.set({
            key: 'thari_shared_balance',
            value: JSON.stringify(data),
          });
        }
      }

      // 3. Dispatch custom event for hybrid bridge listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('thari-widget-updated', { detail: data }));
      }
    } catch (e) {
      console.warn('WidgetService update error:', e);
    }
  },

  async getCachedWidgetData(): Promise<WidgetData | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('thari_widget_cache');
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch {}
    return null;
  }
};
