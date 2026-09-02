/**
 * Server-side Sanitization and PII Redaction Utility
 * Cleans user inputs, prompts, history, and financial context before forwarding to GenAI.
 */

export const REDACTED_EMAIL = '[REDACTED_EMAIL]';
export const REDACTED_PHONE = '[REDACTED_PHONE]';
export const REDACTED_CC = '[REDACTED_CC]';
export const REDACTED_IBAN = '[REDACTED_IBAN]';
export const REDACTED_SECRET = '[REDACTED_SECRET]';
export const TRUNCATED_MARKER = ' [TRUNCATED]';

// Regex patterns
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,6}/g;
const CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g;
const API_KEY_OR_BASE64_REGEX = /\b(?:AIzaSy[A-Za-z0-9-_]{33}|sk-[a-zA-Z0-9-_]{20,}|[A-Za-z0-9+/=_-]{40,})\b/g;

/**
 * Sanitizes and redacts PII, long tokens, and truncates overly long strings.
 */
export function sanitizeAndRedact(input: any, maxLength: number = 2000): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized = input;

    // 1. Redact API keys / long tokens
    sanitized = sanitized.replace(API_KEY_OR_BASE64_REGEX, REDACTED_SECRET);

    // 2. Redact PII
    sanitized = sanitized.replace(EMAIL_REGEX, REDACTED_EMAIL);
    sanitized = sanitized.replace(PHONE_REGEX, (match) => {
      if (match.includes('-') && match.length === 10 && match.startsWith('20')) return match;
      return REDACTED_PHONE;
    });
    sanitized = sanitized.replace(CC_REGEX, REDACTED_CC);
    sanitized = sanitized.replace(IBAN_REGEX, REDACTED_IBAN);

    // 3. Truncate if exceeding max length
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
      if (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('secret')) {
        sanitizedObj[key] = REDACTED_SECRET;
        continue;
      }
      sanitizedObj[key] = sanitizeAndRedact(input[key], maxLength);
    }
    return sanitizedObj;
  }

  return String(input);
}
