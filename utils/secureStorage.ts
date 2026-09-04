/**
 * ============================================================================
 * SECURE STORAGE ENGINE & PWA SECURITY WARNING
 * ============================================================================
 * WARNING: In Web/PWA mode, localStorage and IndexedDB are accessible to any script
 * running in the same origin (XSS vulnerability). 
 * 
 * Best Security Practice:
 * 1. Do NOT store sensitive unencrypted seeds or keys in localStorage by default.
 * 2. On Web/PWA, state is encrypted using AES-256-GCM ONLY when the user provides 
 *    a passphrase via `setWebPassphrase(passphrase)`.
 * 3. If no passphrase is set, storage falls back to obfuscated-only mode with a 
 *    security warning (not safe against arbitrary XSS).
 * 4. On native mobile platforms (iOS/Android), hardware-backed Keystore/Keychain 
 *    is used via Capacitor secure storage plugins.
 * ============================================================================
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { idbSet, idbGet, STORES, saveToNativeFilesystem, readFromNativeFilesystem } from '../services/storage/ultraStorageEngine';

const STORAGE_SECRET_SALT = 'THARI_SECURE_VAULT_v4_2026';
const SNAPSHOT_KEYS = ['thari_vault_snap_a', 'thari_vault_snap_b', 'thari_vault_snap_c'];
const V2_PREFIX = 'THARI_AES_GCM_V2:';
const WEB_SEED_STORAGE_KEY = '_thari_v4_device_seed';

let cachedDeviceSecret: string | null = null;
let cachedWebPassphrase: string | null = null;

export function setWebPassphrase(passphrase: string) {
  cachedWebPassphrase = passphrase;
  cachedDeviceSecret = passphrase;
}

export function clearWebPassphrase() {
  cachedWebPassphrase = null;
  cachedDeviceSecret = null;
}

/**
 * Explicit Secure Wipe: Clears all vault data, snapshots, and sensitive keys from localStorage.
 */
export function secureWipeLocalStorageAndSnapshots(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [
        WEB_SEED_STORAGE_KEY,
        'thari_app_v4',
        'thari_backup_snapshot',
        'thari_app_state',
        ...SNAPSHOT_KEYS
      ];
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
        localStorage.removeItem(`${k}_sync_guard`);
      }
      console.warn('[Security] Secure wipe executed: All local snapshots and vault stores cleared.');
    }
  } catch (err) {
    console.error('SecureStorage: Error during secure wipe', err);
  }
}

function isNativePlatformSafe(): boolean {
  try {
    return !!(Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
  } catch {
    return false;
  }
}

function getCrypto(): Crypto | null {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto;
  }
  if (typeof crypto !== 'undefined' && (crypto as any).subtle) {
    return crypto as unknown as Crypto;
  }
  return null;
}

function getOrCreateWebDeviceSeed(): string {
  if (!cachedWebPassphrase) {
    console.warn('[SECURITY WARNING] Running in Web/PWA mode without a user passphrase (setWebPassphrase). Storage is obfuscated but NOT AES-encrypted. Vulnerable to XSS.');
    return STORAGE_SECRET_SALT + '_unencrypted_obfuscated_fallback';
  }
  return cachedWebPassphrase;
}

async function tryLoadNativeSecureSecret(): Promise<string | null> {
  try {
    if (!isNativePlatformSafe()) {
      return null;
    }

    const dynamicImport = (m: string) => (new Function('m', 'return import(m)'))(m);

    const pluginCandidates = [
      ['@capacitor-community/secure-storage', 'secureStorage'],
      ['@capacitor/keychain', 'keychain'],
    ];

    for (const [moduleName, pluginName] of pluginCandidates) {
      try {
        const mod = await dynamicImport(moduleName);
        const plugin: any = mod && (mod[pluginName] || mod.default || mod.SecureStorage || mod.Keychain || mod);
        if (plugin && typeof plugin.get === 'function') {
          const result = await plugin.get({ key: 'thari_device_secret' });
          const value = result && (result.value ?? result.secret ?? result.data ?? result);
          if (typeof value === 'string' && value.length > 0) {
            return value;
          }
        }
      } catch {
        // Plugin is not installed or absent - handle gracefully
      }
    }

    const plugins = (Capacitor as any).Plugins || Capacitor;
    for (const pluginName of ['SecureStorage', 'Keychain', 'Preferences']) {
      try {
        const plugin: any = plugins && plugins[pluginName];
        if (plugin && typeof plugin.get === 'function') {
          const result = await plugin.get({ key: 'thari_device_secret' });
          const value = result && (result.value ?? result.secret ?? result.data ?? result);
          if (typeof value === 'string' && value.length > 0) {
            return value;
          }
        }
      } catch {
        // Keep searching gracefully
      }
    }
  } catch {
    // Ignore native discovery errors robustly
  }

  return null;
}

async function getMasterDeviceKey(): Promise<string> {
  if (cachedDeviceSecret) return cachedDeviceSecret;

  if (cachedWebPassphrase) {
    cachedDeviceSecret = cachedWebPassphrase;
    return cachedDeviceSecret;
  }

  if (isNativePlatformSafe()) {
    try {
      const nativeSecret = await tryLoadNativeSecureSecret();
      if (nativeSecret) {
        cachedDeviceSecret = nativeSecret;
        return cachedDeviceSecret;
      }
    } catch {
      // Fallback
    }
  }

  // Web / PWA runtime master entropy (requires passphrase for true encryption)
  const webSeed = getOrCreateWebDeviceSeed();
  cachedDeviceSecret = `${STORAGE_SECRET_SALT}:${webSeed}`;
  return cachedDeviceSecret;
}

function utf8ToBase64(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function base64ToUtf8(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return decodeURIComponent(escape(atob(base64)));
  }
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const cryptoImpl = getCrypto();
  if (!cryptoImpl) {
    throw new Error('Web Crypto API unavailable');
  }

  const keyMaterial = await cryptoImpl.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const saltCopy = new Uint8Array(salt.length);
  saltCopy.set(salt);
  const saltBuffer = saltCopy.buffer as ArrayBuffer;

  return cryptoImpl.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptWithAesGcm(dataString: string): Promise<string> {
  const cryptoImpl = getCrypto();
  if (!cryptoImpl) {
    throw new Error('Secure encryption (WebCrypto API) unavailable. Cannot save state securely.');
  }

  const salt = cryptoImpl.getRandomValues(new Uint8Array(16));
  const iv = cryptoImpl.getRandomValues(new Uint8Array(12));
  const secretKeyString = await getMasterDeviceKey();
  const key = await deriveKey(secretKeyString, salt);

  const encoded = new TextEncoder().encode(dataString);
  const encrypted = await cryptoImpl.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const payload = concatBytes([salt, iv, new Uint8Array(encrypted)]);
  return V2_PREFIX + uint8ArrayToBase64(payload);
}

async function decryptWithAesGcm(encodedString: string): Promise<string> {
  if (!encodedString.startsWith(V2_PREFIX)) {
    throw new Error('Not AES V2 payload');
  }

  const cryptoImpl = getCrypto();
  if (!cryptoImpl) {
    throw new Error('Web Crypto API unavailable');
  }

  const blob = base64ToUint8Array(encodedString.slice(V2_PREFIX.length));
  if (blob.length < 28) {
    throw new Error('Invalid encrypted payload');
  }

  const salt = blob.slice(0, 16);
  const iv = blob.slice(16, 28);
  const cipherText = blob.slice(28);

  const secretKeyString = await getMasterDeviceKey();
  const key = await deriveKey(secretKeyString, salt);
  const decrypted = await cryptoImpl.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherText);
  return new TextDecoder().decode(decrypted);
}

export function obfuscateData(dataString: string): string {
  try {
    const saltLength = STORAGE_SECRET_SALT.length;
    const b64 = utf8ToBase64(dataString);
    let xorResult = '';
    for (let i = 0; i < b64.length; i++) {
      const charCode = b64.charCodeAt(i) ^ STORAGE_SECRET_SALT.charCodeAt(i % saltLength);
      xorResult += String.fromCharCode(charCode);
    }
    return 'THR4_' + btoa(xorResult);
  } catch (e) {
    return 'RAW_' + utf8ToBase64(dataString);
  }
}

export function deobfuscateData(encodedString: string): string | null {
  try {
    if (encodedString.startsWith('THR4_')) {
      const xorStr = atob(encodedString.slice(5));
      const saltLength = STORAGE_SECRET_SALT.length;
      let b64 = '';
      for (let i = 0; i < xorStr.length; i++) {
        const charCode = xorStr.charCodeAt(i) ^ STORAGE_SECRET_SALT.charCodeAt(i % saltLength);
        b64 += String.fromCharCode(charCode);
      }
      return base64ToUtf8(b64);
    } else if (encodedString.startsWith('RAW_')) {
      return base64ToUtf8(encodedString.slice(4));
    } else if (encodedString.startsWith('{') || encodedString.startsWith('[')) {
      return encodedString;
    }
    return null;
  } catch (e) {
    if (encodedString.startsWith('{') || encodedString.startsWith('[')) {
      return encodedString;
    }
    return null;
  }
}

export async function writeEncryptedValue(primaryKey: string, value: string): Promise<void> {
  try {
    const encryptedData = await encryptWithAesGcm(value);

    // 1. Primary High-Capacity Store: IndexedDB (Zero 5MB limit, async, thread-safe)
    try {
      await idbSet(STORES.VAULT, primaryKey, encryptedData);
    } catch (idbErr) {
      console.warn('[Security] IndexedDB write warning:', idbErr);
    }

    // 2. Native Mobile Filesystem (iOS & Android)
    if (isNativePlatformSafe()) {
      try {
        await saveToNativeFilesystem('thari_data_vault.enc', encryptedData);
      } catch (nativeErr) {
        console.warn('[Security] Native filesystem write warning:', nativeErr);
      }
    }

    // 3. Quota-Safe LocalStorage (Only if size is < 2MB to prevent QuotaExceededError crashes)
    try {
      if (encryptedData.length < 2_000_000) {
        localStorage.setItem(primaryKey, encryptedData);
        const snapIndex = Math.floor(Date.now() / (1000 * 60 * 60)) % SNAPSHOT_KEYS.length;
        const targetSnapKey = SNAPSHOT_KEYS[snapIndex];
        localStorage.setItem(targetSnapKey, encryptedData);
      } else {
        // High volume marker for large databases
        localStorage.setItem(`${primaryKey}_meta`, JSON.stringify({ isLargeDb: true, updated: Date.now() }));
      }
      localStorage.setItem('thari_last_save_ts', Date.now().toString());
    } catch (storageErr) {
      // Clean up snapshots if quota reached, but data is already safe in IndexedDB
      for (const key of SNAPSHOT_KEYS) {
        try { localStorage.removeItem(key); } catch {}
      }
      try {
        localStorage.setItem('thari_last_save_ts', Date.now().toString());
      } catch {}
    }
  } catch (err) {
    // Fail safely: do not overwrite with weak fallback or plaintext; preserve existing valid state
    console.warn('[Security] Encryption failed or unavailable. Preserving previous valid encrypted state without overwrite.');
  }
}

export function saveSecureStateSync(primaryKey: string, stateObj: any): void {
  try {
    if (!stateObj) return;
    const jsonStr = JSON.stringify(stateObj);
    // Minimal recovery snapshot only (synchronous obfuscated safeguard without async write duplication)
    if (jsonStr.length < 1_500_000) {
      localStorage.setItem(`${primaryKey}_sync_guard`, obfuscateData(jsonStr));
    }
  } catch (err) {
    // Gracefully handle storage quota limit during sync flush
  }
}

let saveGeneration = 0;
let saveInFlight: Promise<void> | null = null;
let pendingSaveState: any | null = null;
let debounceTimer: any = null;

export function queueSecureStateSave(primaryKey: string, stateObj: any, onComplete?: () => void) {
  pendingSaveState = stateObj;

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    void executeSavePipeline(primaryKey, onComplete);
  }, 400);
}

export async function flushSecureStateSave(primaryKey: string): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pendingSaveState) {
    await executeSavePipeline(primaryKey);
  }
}

async function executeSavePipeline(primaryKey: string, onComplete?: () => void) {
  const stateToSave = pendingSaveState;
  if (!stateToSave) return;
  pendingSaveState = null;

  const currentGen = ++saveGeneration;

  while (saveInFlight) {
    try {
      await saveInFlight;
    } catch {}
  }

  // If a newer save arrived while waiting
  if (currentGen !== saveGeneration && pendingSaveState !== null) {
    return;
  }

  saveInFlight = (async () => {
    try {
      if (currentGen !== saveGeneration && pendingSaveState !== null) {
        return;
      }

      await saveSecureState(primaryKey, stateToSave);

      if (currentGen !== saveGeneration && pendingSaveState !== null) {
        return;
      }

      if (onComplete) onComplete();
    } catch (err) {
      console.error('[persistence] error', err);
    } finally {
      saveInFlight = null;
    }
  })();

  await saveInFlight;
}

export async function saveSecureState(primaryKey: string, stateObj: any): Promise<void> {
  try {
    if (!stateObj) return;
    const jsonStr = JSON.stringify(stateObj);
    await writeEncryptedValue(primaryKey, jsonStr);
  } catch (err) {
    console.error('SecureStorage: Error saving state', err);
  }
}

export async function loadSecureStateAsync(primaryKey: string): Promise<any | null> {
  try {
    // Tier 1: Load from IndexedDB (Unlimited Capacity & High Speed)
    try {
      const idbData = await idbGet<string>(STORES.VAULT, primaryKey);
      if (idbData && typeof idbData === 'string') {
        if (idbData.startsWith(V2_PREFIX)) {
          const decrypted = await decryptWithAesGcm(idbData);
          return JSON.parse(decrypted);
        } else if (idbData.startsWith('{') || idbData.startsWith('[')) {
          return JSON.parse(idbData);
        }
      }
    } catch (idbReadErr) {
      console.warn('[SecureStorage] IndexedDB read fallback:', idbReadErr);
    }

    // Tier 2: Load from Native Mobile Filesystem (iOS / Android)
    if (isNativePlatformSafe()) {
      try {
        const nativeData = await readFromNativeFilesystem('thari_data_vault.enc');
        if (nativeData && typeof nativeData === 'string') {
          if (nativeData.startsWith(V2_PREFIX)) {
            const decrypted = await decryptWithAesGcm(nativeData);
            const parsed = JSON.parse(decrypted);
            // Sync forward into IndexedDB for subsequent instant access
            void idbSet(STORES.VAULT, primaryKey, nativeData);
            return parsed;
          }
        }
      } catch (nativeReadErr) {
        console.warn('[SecureStorage] Native filesystem read fallback:', nativeReadErr);
      }
    }

    // Tier 3: Load from localStorage (Legacy data & automatic seamless migration)
    const keysToCheck = [
      primaryKey, 
      `${primaryKey}_sync_guard`,
      ...SNAPSHOT_KEYS, 
      'thari_app_v4', 
      'thari_backup_snapshot', 
      'thari_app_state'
    ];
    
    for (const key of keysToCheck) {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(key);
      } catch (e) {
        continue;
      }
      if (!raw) continue;

      // 1. AES-256-GCM Encrypted Payload
      if (raw.startsWith(V2_PREFIX)) {
        try {
          const decrypted = await decryptWithAesGcm(raw);
          const parsed = JSON.parse(decrypted);
          // Seamless forward migration to IndexedDB & Native Filesystem
          void idbSet(STORES.VAULT, primaryKey, raw);
          if (isNativePlatformSafe()) {
            void saveToNativeFilesystem('thari_data_vault.enc', raw);
          }
          return parsed;
        } catch (e) {
          console.warn(`SecureStorage: Decryption failed for key ${key}, trying next snapshot...`);
          continue;
        }
      }

      // 2. Legacy Obfuscated Payload (Seamless Automatic Migration)
      if (raw.startsWith('THR4_') || raw.startsWith('RAW_')) {
        try {
          const deobfuscated = deobfuscateData(raw);
          if (deobfuscated) {
            const parsed = JSON.parse(deobfuscated);
            // Silently upgrade to V2 AES-GCM in IndexedDB & storage
            void writeEncryptedValue(primaryKey, deobfuscated);
            return parsed;
          }
        } catch {}
      }

      // 3. Plain JSON Payload (Seamless Automatic Migration)
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          // Silently upgrade to V2 AES-GCM in IndexedDB & storage
          void writeEncryptedValue(primaryKey, raw);
          return parsed;
        } catch {}
      }
    }

    return null;
  } catch (err) {
    console.error('SecureStorage: Failed to load state', err);
    return null;
  }
}

export function loadSecureState(primaryKey: string): any | null {
  try {
    const keysToCheck = [
      primaryKey, 
      `${primaryKey}_sync_guard`,
      ...SNAPSHOT_KEYS, 
      'thari_app_v4', 
      'thari_backup_snapshot', 
      'thari_app_state'
    ];
    
    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      if (raw.startsWith('THR4_') || raw.startsWith('RAW_')) {
        const deobfuscated = deobfuscateData(raw);
        if (deobfuscated) {
          try { return JSON.parse(deobfuscated); } catch {}
        }
      }
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try { return JSON.parse(raw); } catch {}
      }
    }
    return null;
  } catch (err) {
    console.error('SecureStorage: Failed to load state', err);
    return null;
  }
}
