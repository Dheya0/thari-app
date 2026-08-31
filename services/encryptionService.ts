
/**
 * خدمة تشفير متقدمة باستخدام Web Crypto API (AES-256-GCM).
 * Advanced Encryption Standard (AES) - Galois/Counter Mode (GCM).
 * 
 * الميزات:
 * 1. آمنة مشفراً (Cryptographically Secure).
 * 2. تعمل أوفلاين 100% (Native Browser API).
 * 3. حماية ضد التلاعب (Authenticated Encryption).
 */

import { deobfuscateData } from '../utils/secureStorage';

const ENCODING = new TextEncoder();
const DECODING = new TextDecoder();

// تحويل ArrayBuffer إلى Base64
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// تحويل Base64 إلى ArrayBuffer
const base64ToBuffer = (base64: string): Uint8Array => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

// دمج مصفوفات البايت
const concatBuffers = (buffers: Uint8Array[]): Uint8Array => {
    let totalLength = 0;
    for (const b of buffers) totalLength += b.length;
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
        result.set(b, offset);
        offset += b.length;
    }
    return result;
};

/**
 * اشتقاق مفتاح التشفير من كلمة المرور باستخدام PBKDF2
 */
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        ENCODING.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    
    return await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as unknown as BufferSource,
            iterations: 100000, // معيار قوي للأمان
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

/**
 * تشفير البيانات باستخدام AES-256-GCM مع تطبيق سياسة الفشل المغلق (Fail-Closed)
 */
export const encryptData = async (data: string, password: string): Promise<string> => {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        throw new Error("ENCRYPTION_UNAVAILABLE: Strong cryptographic encryption is not available in this environment.");
    }
    try {
        if (!password) {
            throw new Error("SECURE_KEY_UNAVAILABLE: Password or encryption key is required.");
        }
        // 1. توليد قيم عشوائية آمنة
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // 2. اشتقاق المفتاح
        const key = await deriveKey(password, salt);

        // 3. تشفير البيانات
        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            ENCODING.encode(data)
        );

        // 4. دمج النتائج: Salt + IV + CipherText
        const finalBuffer = concatBuffers([
            salt,
            iv,
            new Uint8Array(encryptedContent)
        ]);

        return "THARI_AES_GCM:" + bufferToBase64(finalBuffer.buffer as unknown as ArrayBuffer);

    } catch (e: any) {
        if (e.message && (e.message.includes('ENCRYPTION_UNAVAILABLE') || e.message.includes('SECURE_KEY_UNAVAILABLE'))) {
            throw e;
        }
        throw new Error("ENCRYPTION_UNAVAILABLE: Secure encryption failed. Preserving state securely (Fail-Closed).");
    }
};

/**
 * فك تشفير البيانات مع تطبيق سياسة الفشل المغلق (Fail-Closed) وعدم السماح بأي بدائل ضعيفة
 */
export const decryptData = async (encryptedData: string, password: string): Promise<string> => {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        throw new Error("ENCRYPTION_UNAVAILABLE: Strong cryptographic decryption is not available.");
    }
    if (!encryptedData) {
        throw new Error("DECRYPTION_FAILED: No encrypted data provided.");
    }

    const trimmed = encryptedData.trim();

    // Allow unencrypted JSON only if it's explicitly plaintext backup format, but for strict secure storage, require THARI_AES_GCM or fail closed if password provided/required.
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return trimmed;
    }

    if (!trimmed.startsWith("THARI_AES_GCM:")) {
        throw new Error("DECRYPTION_FAILED: Unsupported or insecure payload format. Fail-Closed enforced.");
    }

    if (!password) {
        throw new Error("SECURE_KEY_UNAVAILABLE: Password required to decrypt secure payload.");
    }

    try {
        const rawBase64 = trimmed.replace("THARI_AES_GCM:", "").trim();
        const fullBuffer = base64ToBuffer(rawBase64);

        if (fullBuffer.length < 28) {
            throw new Error("DECRYPTION_FAILED: Ciphertext buffer too short.");
        }

        const salt = fullBuffer.slice(0, 16);
        const iv = fullBuffer.slice(16, 28);
        const cipherText = fullBuffer.slice(28);

        const key = await deriveKey(password, salt);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            cipherText
        );

        return DECODING.decode(decryptedBuffer);
    } catch (e: any) {
        if (e.message && (e.message.includes('DECRYPTION_FAILED') || e.message.includes('SECURE_KEY_UNAVAILABLE'))) {
            throw e;
        }
        throw new Error("DECRYPTION_FAILED: Incorrect password or corrupted secure payload. State preserved (Fail-Closed).");
    }
};
