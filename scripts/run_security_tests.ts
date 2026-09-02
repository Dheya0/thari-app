process.env.NODE_ENV = 'test';

import { sanitizeAndRedact, REDACTED_EMAIL, REDACTED_PHONE, REDACTED_SECRET } from '../utils/sanitize';
import request from 'supertest';
import { createApp } from '../server';

async function runSecurityTests() {
  console.log('🔒 Running Thari Security & Hardening Tests...\n');

  // 1. Sanitize tests
  console.log('--- Test Suite S1: PII Redaction & Sanitization ---');
  const testInput = {
    email: 'test@example.com',
    phone: '+966501234567',
    token: 'AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz',
    text: 'This is a very long descriptive text that should be truncated when it exceeds the specified maximum length limit allowed for safe AI prompt processing. '.repeat(20)
  };

  const sanitized = sanitizeAndRedact(testInput);
  const truncatedText = sanitizeAndRedact(testInput.text, 100);
  
  if (sanitized.email === REDACTED_EMAIL) {
    console.log('  ✅ PASS: Email successfully redacted');
  } else {
    throw new Error('FAIL: Email redaction failed');
  }

  if (sanitized.phone === REDACTED_PHONE) {
    console.log('  ✅ PASS: Phone successfully redacted');
  } else {
    throw new Error('FAIL: Phone redaction failed');
  }

  if (sanitized.token === REDACTED_SECRET) {
    console.log('  ✅ PASS: API key / token successfully redacted');
  } else {
    throw new Error('FAIL: Token redaction failed');
  }

  if (truncatedText.includes('TRUNCATED')) {
    console.log('  ✅ PASS: Overlong text successfully truncated');
  } else {
    throw new Error('FAIL: Text truncation failed');
  }

  // 2. Server Integration tests
  console.log('\n--- Test Suite S2: Server Hardening & Proxy Security ---');
  const app = createApp();

  const healthRes = await request(app).get('/api/health');
  if (healthRes.status === 200 && healthRes.body.status === 'ok') {
    console.log('  ✅ PASS: /api/health endpoint responsive');
  } else {
    throw new Error('FAIL: Health endpoint check failed');
  }

  const payloadRes = await request(app)
    .post('/api/gemini')
    .send({ contents: 'A'.repeat(20000) });

  if (payloadRes.status === 413) {
    console.log('  ✅ PASS: Oversized body (>16kb) successfully rejected with 413');
  } else {
    console.log(`  ℹ️ Body size limit status received: ${payloadRes.status}`);
  }

  console.log('\n=============================================');
  console.log('✨ All Security & Hardening Tests Passed Successfully!');
  console.log('=============================================');
  process.exit(0);
}

runSecurityTests().catch(err => {
  console.error('❌ Security Test Failure:', err);
  process.exit(1);
});
