/**
 * Server-side Sanitization and PII Redaction Utility
 * Cleans user inputs, prompts, history, and financial context before forwarding to GenAI,
 * and redacts AI output prior to client delivery.
 */

import crypto from 'crypto';

export const REDACTED_EMAIL = '[REDACTED_EMAIL]';
export const REDACTED_PHONE = '[REDACTED_PHONE]';
export const REDACTED_CC = '[REDACTED_CC]';
export const REDACTED_IBAN = '[REDACTED_IBAN]';
export const REDACTED_SECRET = '[REDACTED_SECRET]';
export const TRUNCATED_MARKER = ' [TRUNCATED]';

// Advanced robust PII and token regex patterns (case-insensitive where appropriate)
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const IBAN_REGEX = /\b[A-Za-z]{2}\d{2}[A-Za-z0-9]{10,30}\b/g;
const CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4,6}/g;
const API_KEY_OR_BASE64_REGEX = /\b(?:AIzaSy[A-Za-z0-9-_]{33}|sk-[a-zA-Z0-9-_]{20,}|bearer\s+[a-zA-Z0-9\-_.~+/]+=*|[A-Za-z0-9+/=_-]{55,})\b/gi;

/**
 * Masks phone numbers to prevent leaking full personal PII while retaining readability.
 * Example: +966501234567 -> +***-****-4567
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return REDACTED_PHONE;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return REDACTED_PHONE;
  const last4 = digits.slice(-4);
  return `+***-****-${last4}`;
}

/**
 * Sanitizes and redacts PII, long tokens, and truncates overly long strings.
 */
export function sanitizeAndRedact(input: any, maxLength: number = 4000): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input;

    // 1. Redact API keys / long tokens / credentials
    sanitized = sanitized.replace(API_KEY_OR_BASE64_REGEX, REDACTED_SECRET);

    // 2. Redact structured PII (IBANs, Credit Cards, Emails) BEFORE phones
    sanitized = sanitized.replace(IBAN_REGEX, REDACTED_IBAN);
    sanitized = sanitized.replace(CC_REGEX, REDACTED_CC);
    sanitized = sanitized.replace(EMAIL_REGEX, REDACTED_EMAIL);

    // 3. Mask phone numbers securely without leaking full digits
    sanitized = sanitized.replace(PHONE_REGEX, (match) => maskPhone(match));

    // 4. Truncate if exceeding max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + TRUNCATED_MARKER;
    }

    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeAndRedact(item, maxLength));
  }

  if (typeof input === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('apikey') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('password') ||
        lowerKey.includes('credential') ||
        lowerKey.includes('authorization') ||
        (lowerKey === 'key' && typeof input[key] === 'string' && input[key].length > 20)
      ) {
        sanitizedObj[key] = REDACTED_SECRET;
        continue;
      }
      sanitizedObj[key] = sanitizeAndRedact(input[key], maxLength);
    }
    return sanitizedObj;
  }

  return String(input);
}

/**
 * Hashes user identifier for telemetry to prevent logging raw PII.
 */
export function hashUserId(id?: string | number): string {
  if (!id) return 'anonymous';
  try {
    return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 8);
  } catch {
    return 'hashed_user';
  }
}
