import { BiometricAuth, BiometryType, CheckBiometryResult } from '@aparajita/capacitor-biometric-auth';

export function isNativeCapacitorEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const capacitorObj = (window as any)?.Capacitor ?? (globalThis as any)?.Capacitor;
  const nativeCheck = typeof capacitorObj?.isNativePlatform === 'function' ? capacitorObj.isNativePlatform() : false;
  const platform = typeof capacitorObj?.getPlatform === 'function' ? capacitorObj.getPlatform() : '';
  const protocol = window.location?.protocol || '';
  const userAgent = navigator?.userAgent || '';
  const isFileProtocol = protocol === 'file:';

  if (nativeCheck || platform === 'ios' || platform === 'android') return true;

  return Boolean(
    protocol === 'capacitor:' ||
    (isFileProtocol && !!capacitorObj) ||
    userAgent.includes('Capacitor') ||
    userAgent.includes('Android') && !!capacitorObj ||
    userAgent.includes('iPhone') && !!capacitorObj
  );
}

export function isStandalonePwaMode(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(
    nav?.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.location.hostname === 'localhost' && window.location.port !== '')
  );
}

export interface BiometricAvailability {
  isAvailable: boolean;
  biometryType?: string;
  isFaceId?: boolean;
  isNative?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  isCancelled?: boolean;
  needsUserGesture?: boolean;
}

const WEBAUTHN_CRED_STORAGE_KEY = 'thari_webauthn_cred_id';

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Checks if Biometric authentication (Face ID / Touch ID / Fingerprint) is supported on iPhone / Android / Web.
 */
export async function checkBiometricAvailable(): Promise<BiometricAvailability> {
  const isNative = isNativeCapacitorEnvironment();

  // 1. Native Capacitor Check via @aparajita/capacitor-biometric-auth (iOS & Android)
  if (isNative) {
    try {
      const res: CheckBiometryResult = await BiometricAuth.checkBiometry();
      if (res.isAvailable) {
        let typeName = 'بصمة الإصبع / Face ID';
        let isFace = false;

        if (res.biometryType === BiometryType.faceId || res.biometryType === BiometryType.faceAuthentication) {
          typeName = 'بصمة الوجه (Face ID)';
          isFace = true;
        } else if (res.biometryType === BiometryType.touchId) {
          typeName = 'بصمة الإصبع (Touch ID)';
          isFace = false;
        } else if (res.biometryType === BiometryType.fingerprintAuthentication) {
          typeName = 'بصمة الإصبع';
          isFace = false;
        } else if (res.biometryType === BiometryType.irisAuthentication) {
          typeName = 'بصمة العين (Iris)';
          isFace = true;
        }

        return {
          isAvailable: true,
          biometryType: typeName,
          isFaceId: isFace,
          isNative: true,
        };
      }
    } catch (e) {
      console.warn('BiometricAuth.checkBiometry error:', e);
    }
  }

  // 2. Web / PWA WebAuthn Platform Authenticator (iOS Safari / Mac / Android Chrome)
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const isPlatformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isPlatformAvailable) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        return {
          isAvailable: true,
          biometryType: isIOS ? 'بصمة الوجه (Face ID) أو الإصبع' : 'بصمة الجهاز (WebAuthn)',
          isFaceId: isIOS,
          isNative: false,
        };
      }
    } catch (e) {
      console.warn('WebAuthn platform check error:', e);
    }
  }

  return { isAvailable: false, isNative: false };
}

/**
 * Registers / Enrolls Biometrics via WebAuthn on iOS Safari / Web
 */
export async function registerWebBiometrics(): Promise<BiometricAuthResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !window.crypto) {
    return { success: false, error: 'المستشعر الحيوي غير مدعوم في هذا المتصفح' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const hostname = window.location.hostname || 'localhost';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'تطبيق ثري المالي',
          id: isLocalhost ? undefined : hostname,
        },
        user: {
          id: Uint8Array.from('thari_secure_user_id', c => c.charCodeAt(0)),
          name: 'user@thari.app',
          displayName: 'مستخدم ثري',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (credential && credential.rawId) {
      const b64Id = arrayBufferToBase64(credential.rawId);
      localStorage.setItem(WEBAUTHN_CRED_STORAGE_KEY, b64Id);
      return { success: true };
    }

    return { success: false, error: 'لم يتم حفظ البصمة' };
  } catch (err: any) {
    console.warn('WebAuthn registration error:', err);
    const msg = String(err?.message || '');
    if (msg.includes('not allowed') || err?.name === 'NotAllowedError') {
      return { success: false, isCancelled: true, error: 'تم إلغاء تسجيل البصمة أو لم يتم النقر مباشرة على الشاشة' };
    }
    return { success: false, error: err?.message || 'فشل إعداد بصمة الجهاز' };
  }
}

/**
 * Authenticates user via Face ID / Touch ID using @aparajita/capacitor-biometric-auth on Native
 * or WebAuthn on Web / iOS Safari.
 */
export async function authenticateBiometrics(
  reason = 'تأكيد الهوية لفتح تطبيق ثري'
): Promise<BiometricAuthResult> {
  const isNative = isNativeCapacitorEnvironment();

  // 1. Native Capacitor Biometric Auth (@aparajita/capacitor-biometric-auth)
  if (isNative) {
    try {
      await BiometricAuth.authenticate({
        reason: reason,
        cancelTitle: 'إلغاء',
        iosFallbackTitle: 'إدخال رمز PIN',
        androidTitle: 'تطبيق ثري - تأكيد الهوية',
        androidSubtitle: 'استخدم Face ID أو بصمة الإصبع للمتابعة',
        androidConfirmationRequired: false,
      });
      return { success: true };
    } catch (nativeErr: any) {
      console.warn('BiometricAuth.authenticate error:', nativeErr);
      
      const errMsg = String(nativeErr?.message || nativeErr?.code || '').toLowerCase();
      const isCancel = errMsg.includes('cancel') || 
                       errMsg.includes('user_canceled') ||
                       errMsg.includes('usercanceled') ||
                       errMsg.includes('13');

      if (isCancel) {
        return { success: false, isCancelled: true, error: 'تم إلغاء التحقق بالبصمة' };
      }

      return { 
        success: false, 
        isCancelled: false, 
        error: nativeErr?.message || 'تعذر مطابقة البصمة، يرجى إدخال رمز PIN' 
      };
    }
  }

  // 2. Web / PWA WebAuthn Authentication (iOS Safari / Web)
  if (typeof window !== 'undefined' && window.PublicKeyCredential && window.crypto) {
    try {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        return { success: false, error: 'مستشعر البصمة غير متاح على هذا المتصفح' };
      }

      const storedCredId = localStorage.getItem(WEBAUTHN_CRED_STORAGE_KEY);
      const hostname = window.location.hostname || 'localhost';
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

      if (storedCredId) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          const credential = await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              userVerification: 'required',
              rpId: isLocalhost ? undefined : hostname,
              allowCredentials: [
                {
                  id: base64ToUint8Array(storedCredId) as unknown as BufferSource,
                  type: 'public-key',
                  transports: ['internal'],
                },
              ],
            },
          });

          if (credential) {
            return { success: true };
          }
        } catch (getErr: any) {
          console.warn('WebAuthn get failed, fallback to fresh registration:', getErr);
        }
      }

      // If no stored credential or invalid, register & authenticate
      const regResult = await registerWebBiometrics();
      return regResult;
    } catch (webErr: any) {
      console.warn('WebAuthn authenticate error:', webErr);
      if (webErr?.name === 'NotAllowedError') {
        return { 
          success: false, 
          needsUserGesture: true,
          error: 'انقر على زر Face ID / البصمة للتحقق المباشر' 
        };
      }
      return { success: false, error: 'تعذر التحقق من البصمة' };
    }
  }

  return { success: false, error: 'المستشعر الحيوي غير مدعوم على هذا الجهاز' };
}
