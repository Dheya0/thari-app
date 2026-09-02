/**
 * Server-side Sanitization and PII Redaction Utility
 * Cleans user inputs, prompts, history, and financial context before forwarding to GenAI,
 * and redacts AI output prior to client delivery.
 * Uses libphonenumber-js for precise phone parsing and E.164 normalization/masking.
 */

import crypto from 'crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const REDACTED_EMAIL = '[REDACTED_EMAIL]';
export const REDACTED_PHONE = '[REDACTED_PHONE]';
export const REDACTED_CC = '[REDACTED_CC]';
export const REDACTED_IBAN = '[REDACTED_IBAN]';
export const REDACTED_SECRET = '[REDACTED_SECRET]';
export const TRUNCATED_MARKER = ' [TRUNCATED]';

// Advanced robust PII and token regex patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;
const CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const PHONE_CANDIDATE_REGEX = /(?:\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,6}/g;
const API_KEY_OR_BASE64_REGEX = /\b(?:AIzaSy[A-Za-z0-9-_]{33}|sk-[A-Za-z0-9-_]{20,}|[A-Za-z0-9+/=_-]{40,})\b/g;

/**
 * Normalizes and masks phone numbers using libphonenumber-js.
 * Returns a secure masked form (e.g. ****...1234) and avoids leaking raw phone digits.
 */
export function maskPhone(input: string): string {
  if (!input || typeof input !== 'string') return REDACTED_PHONE;
  try {
    // Attempt to parse with libphonenumber-js (defaulting to international or SA/general if possible, or parsing raw digits)
    const cleaned = input.trim();
    let parsed = parsePhoneNumberFromString(cleaned);
    if (!parsed && !cleaned.startsWith('+')) {
      // Try with + prefix or common country codes if needed, or parse digits
      parsed = parsePhoneNumberFromString('+' + cleaned.replace(/\D/g, ''));
    }

    const nationalNumber = parsed ? parsed.nationalNumber : cleaned.replace(/\D/g, '');
    if (!nationalNumber || nationalNumber.length < 4) {
      return REDACTED_PHONE;
    }

    const last4 = nationalNumber.slice(-4);
    const maskedPrefix = '*'.repeat(Math.max(4, nationalNumber.length - 4));
    return `${maskedPrefix}-${last4}`;
  } catch {
    // Fallback regex mask retaining last 4 digits
    try {
      return input.replace(/\d(?=\d{4})/g, '*');
    } catch {
      return REDACTED_PHONE;
    }
  }
}

/**
 * Hashes phone numbers securely for telemetry/logging.
 */
export function hashPhone(input: string): string {
  if (!input) return 'hash_unknown';
  try {
    const cleaned = input.replace(/\D/g, '');
    return crypto.createHash('sha256').update(cleaned).digest('hex').slice(0, 12);
  } catch {
    return 'hashed_phone';
  }
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

    // 3. Mask phone numbers using libphonenumber-js-backed maskPhone
    sanitized = sanitized.replace(PHONE_CANDIDATE_REGEX, (match) => {
      try {
        return maskPhone(match);
      } catch {
        return REDACTED_PHONE;
      }
    });

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
    const sensitiveKeyPattern = /(api[_-]?key|apikey|token|secret|authorization|password|credential|key)/i;
    
    for (const key of Object.keys(input)) {
      if (sensitiveKeyPattern.test(key) || (typeof input[key] === 'string' && String(input[key]).length > 40)) {
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
