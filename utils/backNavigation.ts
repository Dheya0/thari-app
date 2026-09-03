import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { isNativeCapacitorEnvironment } from '../services/biometricService';

export type BackHandler = () => boolean;

interface RegisteredHandler {
  id: string;
  handler: BackHandler;
  priority: number;
  createdAt: number;
}

export class BackNavigationManager {
  private handlers: RegisteredHandler[] = [];
  private isNativeListenerAttached = false;
  private isWebListenerAttached = false;
  private isKeyboardListenerAttached = false;
  private fallbackHandler: (() => void) | null = null;
  private idCounter = 0;
  private lastBackTriggerTime = 0;
  public static readonly MIN_BACK_INTERVAL_MS = 180;

  constructor() {
    this.initListeners();
  }

  public resetForTesting() {
    this.handlers = [];
    this.fallbackHandler = null;
    this.lastBackTriggerTime = 0;
    this.idCounter = 0;
  }

  public initListeners() {
    if (typeof window === 'undefined') return;

    if (isNativeCapacitorEnvironment() && !this.isNativeListenerAttached) {
      this.isNativeListenerAttached = true;
      try {
        CapApp.addListener('backButton', () => {
          this.handleBack();
        });
      } catch (e) {
        console.warn('Could not attach CapApp backButton listener', e);
      }
    }

    if (!this.isWebListenerAttached) {
      this.isWebListenerAttached = true;
      window.addEventListener('popstate', () => {
        const handled = this.handleBack();
        if (handled) {
          // Push a dummy state so the browser history stays primed for subsequent back actions
          try {
            window.history.pushState({ modalOpen: true }, '');
          } catch {}
        }
      });
    }

    if (!this.isKeyboardListenerAttached) {
      this.isKeyboardListenerAttached = true;
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        const isInput = target && (
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
          target.isContentEditable
        );

        if (e.key === 'Backspace' && !isInput && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.handleBack();
        } else if (e.key === 'Escape') {
          this.handleBack();
        }
      });
    }
  }

  public register(handler: BackHandler, priority: number = 0): () => void {
    const id = `bh_${++this.idCounter}_${Date.now()}`;
    const item: RegisteredHandler = {
      id,
      handler,
      priority,
      createdAt: Date.now(),
    };
    this.handlers.push(item);

    // Keep web browser history stack in sync if applicable
    if (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') {
      try {
        window.history.pushState({ handlerId: id }, '');
      } catch {}
    }

    return () => {
      this.unregister(id);
    };
  }

  public unregister(id: string) {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  public setFallbackHandler(fallback: () => void) {
    this.fallbackHandler = fallback;
  }

  /**
   * Triggers the top-most back handler in the navigation stack.
   * Returns true if handled, false otherwise.
   */
  public handleBack(ignoreThrottle: boolean = false): boolean {
    const now = Date.now();
    if (!ignoreThrottle && now - this.lastBackTriggerTime < BackNavigationManager.MIN_BACK_INTERVAL_MS) {
      // Rapid back throttle: avoid double pop / skipping screens
      return true;
    }
    this.lastBackTriggerTime = now;

    // 1. If an input or textarea is active, blur it first to hide keyboard cleanly
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement;
      if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
        if (activeEl instanceof HTMLElement) {
          activeEl.blur();
        }
        return true;
      }
    }

    // 2. Sort handlers: highest priority first, then LIFO (most recently registered first)
    const sorted = [...this.handlers].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.createdAt - a.createdAt;
    });

    for (const item of sorted) {
      try {
        const handled = item.handler();
        if (handled) {
          return true;
        }
      } catch (err) {
        console.warn('Error in back handler:', err);
      }
    }

    // 3. Fallback handler (e.g. switch to dashboard or exit app)
    if (this.fallbackHandler) {
      try {
        this.fallbackHandler();
        return true;
      } catch (e) {
        console.warn('Error in fallback handler:', e);
      }
    }

    return false;
  }
}

export const backNavigationManager = new BackNavigationManager();

/**
 * React Hook to register an active component in the global back navigation stack.
 *
 * @param handler Function returning true if it consumed the back event, false otherwise
 * @param isActive Whether the handler is currently active (e.g. modal is open or sub-view is visible)
 * @param priority Higher priority runs before lower priority (default 0)
 */
export function useBackNavigation(
  handler: BackHandler,
  isActive: boolean = true,
  priority: number = 0
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!isActive) return;

    const unregister = backNavigationManager.register(() => {
      return handlerRef.current();
    }, priority);

    return () => {
      unregister();
    };
  }, [isActive, priority]);
}
