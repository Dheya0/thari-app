process.env.NODE_ENV = 'test';

import { sanitizeAndRedact, maskPhone, REDACTED_EMAIL, REDACTED_PHONE, REDACTED_SECRET, REDACTED_IBAN, REDACTED_CC } from '../utils/sanitize';
import request from 'supertest';
import { createApp } from '../server';
import path from 'path';
import express from 'express';
import fs from 'fs';

async function runSecurityTests() {
  console.log('🔒 Running Thari Advanced Security & Hardening Tests...\n');

  // 1. Sanitize tests & edge cases
  console.log('--- Test Suite S1: PII Redaction & Sanitization Edge Cases ---');
  
  const testInput = {
    email: 'user.name+tag@sub.domain.org',
    phoneSaudi: '+966501234567',
    phoneLocal: '0501234567',
    phoneFormatted: '+20 10 1234 5678',
    token: 'AIzaSyD-1234567890abcdefghijklmnopqrstuvwxyz',
    bearerToken: 'Bearer sk-proj-1234567890abcdefghijklmnopqrstuvwxyz',
    iban: 'SA2900000012345678901234',
    cc: '4532-1234-5678-9010',
    secretProp: 'my-sensitive-secret-value',
    nested: {
      apiKey: 'secret-api-key-value',
      data: 'normal value'
    },
    nullVal: null,
    undefinedVal: undefined,
    numberVal: 12345,
    boolVal: true,
    text: 'This is a very long descriptive text that should be truncated when it exceeds the specified maximum length limit allowed for safe AI prompt processing. '.repeat(20)
  };

  const sanitized = sanitizeAndRedact(testInput);
  const truncatedText = sanitizeAndRedact(testInput.text, 50);

  if (sanitized.email === REDACTED_EMAIL) {
    console.log('  ✅ PASS: Complex email successfully redacted');
  } else {
    throw new Error('FAIL: Complex email redaction failed');
  }

  // Verify phone masking (does not leak full phone digits)
  if (sanitized.phoneSaudi.includes('4567') && !sanitized.phoneSaudi.includes('501234')) {
    console.log('  ✅ PASS: Phone number successfully masked (retaining last 4 digits without leak)');
  } else {
    throw new Error('FAIL: Phone masking leaked full digits or failed');
  }

  if (sanitized.token === REDACTED_SECRET && sanitized.bearerToken === REDACTED_SECRET && sanitized.secretProp === REDACTED_SECRET && sanitized.nested.apiKey === REDACTED_SECRET) {
    console.log('  ✅ PASS: API keys, bearer tokens, and nested secret keys successfully redacted');
  } else {
    throw new Error('FAIL: Token or property redaction failed');
  }

  if (sanitized.iban === REDACTED_IBAN && sanitized.cc === REDACTED_CC) {
    console.log('  ✅ PASS: IBAN and Credit Card numbers successfully redacted');
  } else {
    throw new Error('FAIL: IBAN or Credit Card redaction failed');
  }

  if (sanitized.nullVal === null && sanitized.undefinedVal === undefined && sanitized.numberVal === 12345 && sanitized.boolVal === true) {
    console.log('  ✅ PASS: Primitives, null, and undefined handled correctly');
  } else {
    throw new Error('FAIL: Primitive handling failed');
  }

  if (truncatedText.includes('TRUNCATED')) {
    console.log('  ✅ PASS: Overlong text successfully truncated');
  } else {
    throw new Error('FAIL: Text truncation failed');
  }

  // 2. Server Integration & Authentication Hardening Tests
  console.log('\n--- Test Suite S2: Server Hardening & Authentication Security ---');
  
  // Test 2a: Without ALLOW_INSECURE_DEV in non-production, missing token should return 401
  delete process.env.ALLOW_INSECURE_DEV;
  delete process.env.APP_AUTH_TOKEN;
  let app = createApp();

  let unauthRes = await request(app).post('/api/gemini').send({ contents: 'test' });
  if (unauthRes.status === 401) {
    console.log('  ✅ PASS: Missing token correctly rejected with 401 in dev by default');
  } else {
    throw new Error(`FAIL: Expected 401 for missing token in dev, got ${unauthRes.status}`);
  }

  // Test 2b: With ALLOW_INSECURE_DEV=true in non-production, missing token is allowed through
  process.env.ALLOW_INSECURE_DEV = 'true';
  app = createApp();
  let insecureRes = await request(app).post('/api/gemini').send({ contents: 'test' });
  if (insecureRes.status !== 401) {
    console.log(`  ✅ PASS: ALLOW_INSECURE_DEV=true allows request past authentication (status: ${insecureRes.status})`);
  } else {
    throw new Error('FAIL: ALLOW_INSECURE_DEV=true failed to bypass auth check');
  }

  // Test 2c: Health check endpoint
  const healthRes = await request(app).get('/api/health');
  if (healthRes.status === 200 && healthRes.body.status === 'ok') {
    console.log('  ✅ PASS: /api/health endpoint responsive');
  } else {
    throw new Error('FAIL: Health endpoint check failed');
  }

  // Test 2e: Production fail-closed when secrets are missing
  process.env.NODE_ENV = 'production';
  delete process.env.APP_AUTH_TOKEN;
  delete process.env.APP_JWT_SECRET;
  const prodSecApp = createApp();
  const prodSecRes = await request(prodSecApp).post('/api/gemini').send({ contents: 'test' });
  if (prodSecRes.status === 501) {
    console.log('  ✅ PASS: Production fail-closed correctly rejects requests with 501 when secrets are missing');
  } else {
    throw new Error(`FAIL: Expected 501 fail-closed in production without secrets, got ${prodSecRes.status}`);
  }
  process.env.NODE_ENV = 'test';

  // 3. Architectural Production HTML & CSP Nonce Invariant Tests
  console.log('\n--- Test Suite S3: Production HTML Transform & CSP Nonce Invariants ---');
  process.env.NODE_ENV = 'production';
  const prodApp = createApp();
  const distPath = path.join(process.cwd(), 'dist');
  prodApp.use(express.static(distPath, { index: false }));
  prodApp.get('*all', (req: any, res: any) => {
    const indexPath = path.join(distPath, 'index.html');
    fs.readFile(indexPath, 'utf8', (err, htmlData) => {
      if (err) {
        return res.status(500).send('Error loading app');
      }
      const nonce = res.locals.cspNonce || '';
      const injectedHtml = htmlData.replace(/%CSP_NONCE%/g, nonce);
      res.send(injectedHtml);
    });
  });

  const prodRootRes = await request(prodApp).get('/');
  if (prodRootRes.status === 200) {
    console.log('  ✅ PASS: Production root / returns 200');
  } else {
    throw new Error(`FAIL: Production root / failed with status ${prodRootRes.status}`);
  }

  const prodHtml = prodRootRes.text;
  const hasUnreplacedProdNonce = prodHtml.includes('%CSP_NONCE%');
  const cspHeader = prodRootRes.headers['content-security-policy'] || '';
  const hasNonceInCsp = cspHeader.includes('nonce-');

  if (!hasUnreplacedProdNonce && hasNonceInCsp) {
    console.log('  ✅ PASS: Production HTML successfully replaced %CSP_NONCE% with active nonce and CSP header is valid');
  } else {
    throw new Error(`FAIL: Production HTML invariant violated (hasUnreplacedProdNonce: ${hasUnreplacedProdNonce}, hasNonceInCsp: ${hasNonceInCsp})`);
  }

  process.env.NODE_ENV = 'test';

  console.log('\n=============================================');
  console.log('✨ All Security & Hardening Tests Passed Successfully!');
  console.log('=============================================');
  process.exit(0);
}

runSecurityTests().catch(err => {
  console.error('❌ Security Test Failure:', err);
  process.exit(1);
});
