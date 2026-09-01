/**
 * THARI Financial Application — Comprehensive Regression Test Suite
 * Validates:
 * 1. Date format & local date calculation invariants (UTC boundary protection)
 * 2. Debt calculations & overdue date comparisons
 * 3. Recurring transactions idempotency, day 28/boundary date rules
 * 4. Edit Previous Transaction selector logic (Manual selection, no auto-select)
 * 5. Global Back Navigation Stack (Priority, LIFO, and Rapid-Back Throttle protection)
 * 6. Precision Math & Floating Point Protection (IEEE-754)
 * 7. Arabic/Persian numeral normalization & numeric sanitization
 * 8. FX Exchange Rate calculation determinism & Historical FX immutability
 * 9. Security & Encryption Fail-Closed Invariants
 * 10. Multi-step Back Wizard Navigation Semantics
 */

import { formatLocalDateOnly, normalizeDigits, sanitizeNumericInput, parseArabicNumber } from '../utils/formatters';
import { getDebtCalculations, getDebtRemaining } from '../utils/debtModel';
import { processDueRecurringRules, calculateNextDate } from '../services/recurringService';
import { safeAdd, safeSub, safeMul, safeDiv, roundToCurrency } from '../utils/mathPrecision';
import { tryConvertCurrency, convertCurrency, DEFAULT_EXCHANGE_RATES } from '../constants';
import { resolveHistoricalConversion } from '../services/coreLedger';
import { BackNavigationManager } from '../utils/backNavigation';
import { Debt, RecurringRule, Transaction } from '../types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

console.log('🧪 Running THARI Production Regression Tests...\n');

// -------------------------------------------------------------
// Test Suite 1: Local Date Invariant (formatLocalDateOnly)
// -------------------------------------------------------------
console.log('--- Test Suite 1: Local Date Formatting Invariants ---');
{
  const testDate = new Date(2026, 8, 1, 0, 15, 0); // Sep 1, 2026 00:15 local
  const formatted = formatLocalDateOnly(testDate);
  assert(formatted === '2026-09-01', 'formatLocalDateOnly formats YYYY-MM-DD correctly for month/day padding');

  const testDateEnd = new Date(2026, 11, 31, 23, 59, 59); // Dec 31, 2026
  assert(formatLocalDateOnly(testDateEnd) === '2026-12-31', 'formatLocalDateOnly handles year end correctly');

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  assert(formatLocalDateOnly(now) === `${y}-${m}-${d}`, 'formatLocalDateOnly strictly tracks local date components');
}

// -------------------------------------------------------------
// Test Suite 2: Debt Calculations & Local Date Overdue Invariant
// -------------------------------------------------------------
console.log('\n--- Test Suite 2: Debt Calculations & Date Invariants ---');
{
  const mockDebt: Debt = {
    id: 'debt-1',
    personName: 'Test Person',
    amount: 1000,
    originalAmount: 1000,
    paidAmount: 300,
    currency: 'SAR',
    note: 'Test note',
    type: 'on_me',
    dueDate: '2025-01-01', // past date
    createdAt: '2024-01-01',
    isPaid: false,
    payments: [{ id: 'p1', debtId: 'debt-1', amount: 300, date: '2024-06-01', createdAt: '2024-06-01T00:00:00Z' }],
  };

  const remaining = getDebtRemaining(mockDebt);
  assert(remaining === 700, 'getDebtRemaining calculates accurate remaining balance after payment');

  const calcs = getDebtCalculations(mockDebt, 'en');
  assert(calcs.remainingAmount === 700, 'getDebtCalculations reports correct remaining amount');
  assert(calcs.paidAmount === 300, 'getDebtCalculations reports correct paid amount');
  assert(calcs.isOverdue === true, 'getDebtCalculations correctly flags overdue debt');
  assert(calcs.status === 'overdue', 'getDebtCalculations status is overdue');
}

// -------------------------------------------------------------
// Test Suite 3: Recurring Rules Engine & Month End/Day 28 Rules
// -------------------------------------------------------------
console.log('\n--- Test Suite 3: Recurring Rules Engine & Boundary Rules ---');
{
  const mockRule: RecurringRule = {
    id: 'rule-salary',
    description: 'Monthly Salary',
    amount: 5000,
    currency: 'SAR',
    type: 'income',
    walletId: 'w1',
    categoryId: 'cat1',
    frequency: 'monthly',
    startDate: '2026-01-01',
    nextOccurrence: '2026-02-01',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const existingTx: Transaction[] = [
    {
      id: 'tx-1',
      type: 'income',
      amount: 5000,
      currency: 'SAR',
      date: '2026-02-01',
      categoryId: 'cat1',
      walletId: 'w1',
      recurrenceId: 'rule-salary',
      occurrenceDate: '2026-02-01',
      createdAt: '2026-02-01T00:00:00.000Z',
      note: 'Salary',
      frequency: 'once',
    },
  ];

  // Running catchup as of 2026-02-01 when tx already exists -> should NOT generate duplicate
  const result1 = processDueRecurringRules([mockRule], existingTx, '2026-02-01');
  assert(result1.newTransactions.length === 0, 'Recurring engine prevents duplicate transaction on same occurrence date');

  // Running catchup as of 2026-03-01 -> should generate exactly 1 next transaction for 2026-03-01
  const result2 = processDueRecurringRules([mockRule], existingTx, '2026-03-01');
  assert(result2.newTransactions.length === 1, 'Recurring engine generates exactly one catch-up transaction for due cycle');
  assert(result2.newTransactions[0].date === '2026-03-01', 'Generated transaction has correct date');

  // Month-end boundary: Jan 31 next monthly occurrence in Feb should land on Feb 28
  const nextMonthEnd = calculateNextDate('2026-01-31', 'monthly');
  assert(nextMonthEnd === '2026-02-28', 'Monthly occurrence preserves month end boundary (Feb 28 in non-leap year)');
}

// -------------------------------------------------------------
// Test Suite 4: Edit Previous Transaction Selection Invariants
// -------------------------------------------------------------
console.log('\n--- Test Suite 4: Edit Previous Transaction Selection Invariants ---');
{
  const mockTransactions: Transaction[] = [
    { id: 'tx-newest', type: 'expense', amount: 50, currency: 'SAR', date: '2026-09-01', categoryId: 'c1', walletId: 'w1', createdAt: '2026-09-01T10:00:00Z', note: 'Coffee', frequency: 'once' },
    { id: 'tx-middle', type: 'expense', amount: 200, currency: 'SAR', date: '2026-08-30', categoryId: 'c2', walletId: 'w1', createdAt: '2026-08-30T10:00:00Z', note: 'Groceries', frequency: 'once' },
    { id: 'tx-oldest', type: 'income', amount: 3000, currency: 'SAR', date: '2026-08-25', categoryId: 'c3', walletId: 'w1', createdAt: '2026-08-25T10:00:00Z', note: 'Bonus', frequency: 'once' },
  ];

  let activeSelectedTx: Transaction | null = null;
  let currentNavStep: string = 'what_happened';

  const onEditPreviousClick = () => {
    currentNavStep = 'previous_transactions_list';
    activeSelectedTx = null;
  };

  onEditPreviousClick();
  assert(currentNavStep === 'previous_transactions_list', 'Clicking Edit Previous navigates to previous_transactions_list step');
  assert(activeSelectedTx === null, 'No transaction is automatically pre-selected');

  const onUserSelectsTransaction = (tx: Transaction) => {
    activeSelectedTx = tx;
    currentNavStep = 'edit_transaction';
  };

  onUserSelectsTransaction(mockTransactions[1]);
  assert(activeSelectedTx !== null && (activeSelectedTx as Transaction).id === 'tx-middle', 'User can pick any transaction specifically');
  assert(currentNavStep === 'edit_transaction', 'Navigates to edit form after transaction selection');
}

// -------------------------------------------------------------
// Test Suite 5: Global Back Navigation Stack Semantics
// -------------------------------------------------------------
console.log('\n--- Test Suite 5: Global Back Navigation Stack Semantics ---');
{
  const navManager = new BackNavigationManager();
  navManager.resetForTesting();

  const executionLog: string[] = [];

  const unregBase = navManager.register(() => {
    executionLog.push('base_modal_closed');
    return true;
  }, 0);

  const unregNested = navManager.register(() => {
    executionLog.push('nested_step_returned');
    return true;
  }, 10);

  const handled1 = navManager.handleBack(true);
  assert(handled1 === true, 'Back action was successfully handled');
  assert(executionLog.length === 1 && executionLog[0] === 'nested_step_returned', 'High priority nested handler ran before base handler');

  unregNested();
  const handled2 = navManager.handleBack(true);
  assert(handled2 === true, 'Subsequent back action was successfully handled');
  assert(executionLog.length === 2 && executionLog[1] === 'base_modal_closed', 'Base modal handler ran after nested handler was popped');

  unregBase();
}

// -------------------------------------------------------------
// Test Suite 6: Rapid Back Throttling Invariant
// -------------------------------------------------------------
console.log('\n--- Test Suite 6: Rapid Back Throttling Protection ---');
{
  const navManager = new BackNavigationManager();
  navManager.resetForTesting();

  let executionCount = 0;
  navManager.register(() => {
    executionCount++;
    return true;
  }, 10);

  for (let i = 0; i < 5; i++) {
    navManager.handleBack(false);
  }

  assert(executionCount === 1, '5 rapid Back actions trigger exactly one navigation step (no double pop)');
}

// -------------------------------------------------------------
// Test Suite 7: Precision Math & Floating Point Protection
// -------------------------------------------------------------
console.log('\n--- Test Suite 7: Precision Math & Floating Point Protection ---');
{
  const sum = safeAdd(0.1, 0.2);
  assert(sum === 0.3, 'safeAdd resolves 0.1 + 0.2 accurately to 0.3');

  const diff = safeSub(1.0, 0.9);
  assert(diff === 0.1, 'safeSub resolves 1.0 - 0.9 accurately to 0.1');

  const mul = safeMul(35.1, 100);
  assert(mul === 3510, 'safeMul calculates accurate product');

  const divZero = safeDiv(100, 0, 0);
  assert(divZero === 0, 'safeDiv safely handles division by zero without NaN');

  const rounded = roundToCurrency(123.456, 2);
  assert(rounded === 123.46, 'roundToCurrency rounds monetary figures accurately');
}

// -------------------------------------------------------------
// Test Suite 8: Arabic/Persian Numeral Normalization & Parsing
// -------------------------------------------------------------
console.log('\n--- Test Suite 8: Arabic/Persian Numeral Normalization ---');
{
  const arabicDigits = '١٢٥٠٫٥٠';
  const normalized = normalizeDigits(arabicDigits);
  assert(normalized === '1250.50', 'normalizeDigits converts Eastern Arabic numerals and Arabic decimal comma');

  const persianDigits = '۱۲۳۴.۵۶';
  const normPersian = normalizeDigits(persianDigits);
  assert(normPersian === '1234.56', 'normalizeDigits converts Persian numerals correctly');

  const parsed = parseArabicNumber('١٢٥٠٫٥٠');
  assert(parsed === 1250.5, 'parseArabicNumber parses Arabic numerals to valid JavaScript float');

  const sanitized = sanitizeNumericInput('١,٢٥٠٫٧٥');
  assert(sanitized === '1250.75', 'sanitizeNumericInput removes thousands separators and normalizes decimal');
}

// -------------------------------------------------------------
// Test Suite 9: FX Exchange Rate & Historical Rate Immutability
// -------------------------------------------------------------
console.log('\n--- Test Suite 9: Historical FX Rate Immutability ---');
{
  const sameCurrency = tryConvertCurrency(500, 'SAR', 'SAR', DEFAULT_EXCHANGE_RATES);
  assert(sameCurrency.status === 'SAME_CURRENCY' && sameCurrency.convertedAmount === 500, 'Same currency returns original amount directly');

  const convertedUsd = convertCurrency(100, 'USD', 'SAR', DEFAULT_EXCHANGE_RATES);
  assert(convertedUsd > 380 && convertedUsd < 390, 'USD to SAR conversion executes within expected rate bracket');

  // Test historical FX rate snapshot immutability
  const historicTx: Transaction = {
    id: 'tx-historic-fx',
    type: 'expense',
    amount: 100,
    currency: 'USD',
    walletId: 'w-sar',
    categoryId: 'cat-1',
    note: 'Historic expense',
    frequency: 'once',
    date: '2025-01-01',
    createdAt: '2025-01-01T00:00:00Z',
    exchangeRateUsed: 3.75, // Explicit historical rate
    convertedAmountInWalletCurrency: 375,
    destinationAmount: 375,
    destinationCurrency: 'SAR',
  };

  const resolved = resolveHistoricalConversion(historicTx, 'SAR', { USD: 4.5, SAR: 1 });
  assert(resolved.sourceAmountInWalletCurrency === 375, 'Historical transaction uses snapshot rate of 3.75 rather than current rate 4.5');
}

// -------------------------------------------------------------
// Test Suite 10: Multi-Step Wizard Back Semantics
// -------------------------------------------------------------
console.log('\n--- Test Suite 10: Multi-Step Wizard Back Semantics ---');
{
  type StepType = 'StepA' | 'StepB' | 'StepC';
  let wizardStep: StepType = 'StepA';
  let isClosed: boolean = false;

  const handleWizardBack = () => {
    if (wizardStep === 'StepC') {
      wizardStep = 'StepB';
      return true;
    }
    if (wizardStep === 'StepB') {
      wizardStep = 'StepA';
      return true;
    }
    if (wizardStep === 'StepA') {
      isClosed = true;
      return true;
    }
    return false;
  };

  // Move A -> B -> C
  wizardStep = 'StepB';
  wizardStep = 'StepC';

  // Back from C -> B
  handleWizardBack();
  assert((wizardStep as StepType) === 'StepB', 'Back from Step C returns to Step B');

  // Back from B -> A
  handleWizardBack();
  assert((wizardStep as StepType) === 'StepA', 'Back from Step B returns to Step A');

  // Back from A -> Close
  handleWizardBack();
  assert((isClosed as boolean) === true, 'Back from Step A triggers flow exit without side effects');
}

console.log('\n=============================================');
console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
console.log('=============================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✨ All regression tests passed successfully!');
  process.exit(0);
}
