import { sanitizeAndRedact, REDACTED_EMAIL, REDACTED_PHONE, REDACTED_CC, REDACTED_IBAN, REDACTED_SECRET } from '../utils/sanitize';

describe('Sanitize and Redact Utility', () => {
  test('redacts emails correctly', () => {
    const input = 'Contact me at user@example.com for details.';
    const output = sanitizeAndRedact(input);
    expect(output).toContain(REDACTED_EMAIL);
    expect(output).not.toContain('user@example.com');
  });

  test('redacts phone numbers correctly', () => {
    const input = 'Call +966-50-123-4567 or 0501234567.';
    const output = sanitizeAndRedact(input);
    expect(output).toContain(REDACTED_PHONE);
    expect(output).not.toContain('0501234567');
  });

  test('redacts long base64 tokens and API keys', () => {
    const input = 'My secret API key is AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz and token SGVsbG8gV29ybGQgVGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgdG9rZW4gdGhhdCBzaG91bGQgYmUgcmVkYWN0ZWQ=';
    const output = sanitizeAndRedact(input);
    expect(output).toContain(REDACTED_SECRET);
    expect(output).not.toContain('AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz');
  });

  test('truncates strings exceeding max length', () => {
    const longString = 'A'.repeat(2500);
    const output = sanitizeAndRedact(longString, 100);
    expect(output.length).toBeLessThan(120);
    expect(output).toContain('[TRUNCATED]');
  });

  test('recursively sanitizes nested objects and arrays', () => {
    const payload = {
      message: 'Hello test@example.com',
      apiKey: 'SECRET_API_KEY_12345678901234567890',
      nested: {
        phone: '+966501234567',
        notes: ['normal note', 'email@test.com']
      }
    };

    const sanitized = sanitizeAndRedact(payload);
    expect(sanitized.message).toContain(REDACTED_EMAIL);
    expect(sanitized.apiKey).toBe(REDACTED_SECRET);
    expect(sanitized.nested.phone).toBe(REDACTED_PHONE);
    expect(sanitized.nested.notes[1]).toContain(REDACTED_EMAIL);
  });
});
