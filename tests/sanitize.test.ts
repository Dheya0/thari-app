import { sanitizeAndRedact, maskPhone, REDACTED_EMAIL, REDACTED_PHONE, REDACTED_SECRET, REDACTED_IBAN, REDACTED_CC } from '../utils/sanitize';

describe('Sanitization and PII Redaction Unit Tests', () => {
  test('Email redaction handles complex addresses', () => {
    const input = 'Contact us at user.name+tag@sub.domain.org for support.';
    const result = sanitizeAndRedact(input);
    expect(result).toContain(REDACTED_EMAIL);
    expect(result).not.toContain('user.name+tag@sub.domain.org');
  });

  test('Phone number parsing and masking handles various formats securely', () => {
    const testCases = [
      { phone: '+15551234567', last4: '4567' },
      { phone: '00966501234567', last4: '4567' },
      { phone: '0501234567', last4: '4567' },
      { phone: '+201012345678', last4: '5678' }
    ];

    for (const tc of testCases) {
      const masked = maskPhone(tc.phone);
      expect(masked).not.toEqual(tc.phone);
      expect(masked).toContain(tc.last4); // retaining last 4 digits

      const redacted = sanitizeAndRedact(`Call me at ${tc.phone} today.`);
      expect(redacted).not.toContain(tc.phone);
      expect(redacted).toContain(tc.last4);
    }
  });

  test('API keys and secrets redaction in text', () => {
    const text = 'Here is my key: AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz and bearer sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
    const result = sanitizeAndRedact(text);
    expect(result).toContain(REDACTED_SECRET);
    expect(result).not.toContain('AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz');
    expect(result).not.toContain('sk-proj-1234567890abcdefghijklmnopqrstuvwxyz');
  });

  test('Sensitive object keys and long strings redaction', () => {
    const obj = {
      username: 'john_doe',
      apiKey: 'secret-api-key-123456789012345678901234567890',
      api_key: 'another-secret',
      token: 'jwt-token-value-here',
      secret: 'my-super-secret',
      nested: {
        password: 'mysecurepassword',
        data: 'safe data'
      },
      longStringProperty: 'A'.repeat(50)
    };

    const sanitized = sanitizeAndRedact(obj);
    expect(sanitized.apiKey).toEqual(REDACTED_SECRET);
    expect(sanitized.api_key).toEqual(REDACTED_SECRET);
    expect(sanitized.token).toEqual(REDACTED_SECRET);
    expect(sanitized.secret).toEqual(REDACTED_SECRET);
    expect(sanitized.nested.password).toEqual(REDACTED_SECRET);
    expect(sanitized.longStringProperty).toEqual(REDACTED_SECRET);
    expect(sanitized.username).toEqual('john_doe');
    expect(sanitized.nested.data).toEqual('safe data');
  });

  test('IBAN and Credit Card redaction', () => {
    const text = 'My IBAN is SA2900000012345678901234 and CC is 4532-1234-5678-9010.';
    const result = sanitizeAndRedact(text);
    expect(result).toContain(REDACTED_IBAN);
    expect(result).toContain(REDACTED_CC);
    expect(result).not.toContain('SA2900000012345678901234');
    expect(result).not.toContain('4532-1234-5678-9010');
  });
});
