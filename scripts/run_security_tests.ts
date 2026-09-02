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
    text: 'This is a very long descriptive text that should be truncated when it exceeds the specified maximum length limit allowed for safe data processing. '.repeat(20)
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
    console.log('  ✅ PASS: Secrets and nested keys successfully redacted');
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

  // 2. Server Integration & Security Headers
  console.log('\n--- Test Suite S2: Server Hardening & Security Headers ---');
  let app = createApp();

  // Test 2a: Health check endpoint
  const healthRes = await request(app).get('/api/health');
  if (healthRes.status === 200 && healthRes.body.status === 'ok') {
    console.log('  ✅ PASS: /api/health endpoint responsive');
  } else {
    throw new Error('FAIL: Health endpoint check failed');
  }

  // Test 2b: Helmet Security Headers Present
  const frameOptions = healthRes.headers['x-frame-options'];
  const contentTypeOptions = healthRes.headers['x-content-type-options'];
  if (frameOptions === 'DENY' && contentTypeOptions === 'nosniff') {
    console.log('  ✅ PASS: Helmet security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff) present');
  } else {
    throw new Error(`FAIL: Helmet security headers missing or incorrect (x-frame-options: ${frameOptions}, x-content-type-options: ${contentTypeOptions})`);
  }

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
    console.log('  ✅ PASS: Production HTML successfully replaced %CSP_NONCE% with active values and CSP header is valid');
  } else {
    throw new Error(`FAIL: Production HTML invariant violated (hasUnreplacedProdNonce: ${hasUnreplacedProdNonce}, hasNonceInCsp: ${hasNonceInCsp})`);
  }

  // 4. Vercel & Production Deployment Configuration Contract
  console.log('\n--- Test Suite S4: Vercel & Production Deployment Smoke Checks ---');
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const startScript = pkgData.scripts?.start;
  if (startScript === 'node dist/server.cjs') {
    console.log('  ✅ PASS: package.json start script accurately resolves to "node dist/server.cjs"');
  } else {
    throw new Error(`FAIL: package.json start script mismatch: "${startScript}"`);
  }

  const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
  if (!fs.existsSync(vercelJsonPath)) {
    throw new Error('FAIL: vercel.json configuration file missing');
  }
  const vercelData = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  if (vercelData.framework === 'vite' && vercelData.buildCommand === 'npm run build' && vercelData.outputDirectory === 'dist') {
    console.log('  ✅ PASS: vercel.json accurately configures Vite framework, npm run build, and dist output directory');
  } else {
    throw new Error('FAIL: vercel.json does not contain required buildCommand or outputDirectory configuration');
  }

  const renderYamlPath = path.join(process.cwd(), 'render.yaml');
  if (fs.existsSync(renderYamlPath)) {
    throw new Error('FAIL: render.yaml should be removed as Render is not part of deployment architecture');
  } else {
    console.log('  ✅ PASS: render.yaml is completely removed from repository');
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
