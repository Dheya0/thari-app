/**
 * THARI Financial Application — Safe Math Expression Service
 * Evaluates math expressions inline (+, -, *, /, %) with financial percentage rules,
 * without using eval() or Function(), ensuring 100% security and accuracy.
 */

// Convert Eastern Arabic / Persian numerals to Western digits
export function normalizeDigits(input: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  
  let normalized = input;
  arabicNumerals.forEach((d, idx) => {
    normalized = normalized.split(d).join(idx.toString());
  });
  persianNumerals.forEach((d, idx) => {
    normalized = normalized.split(d).join(idx.toString());
  });
  // Normalize symbols
  normalized = normalized.replace(/×/g, '*').replace(/÷/g, '/').replace(/،/g, '.');
  return normalized;
}

export function hasMathOperation(input: string): boolean {
  if (!input) return false;
  return /[\+\-\*\/\%×÷]/.test(input);
}

export interface MathEvaluationResult {
  isValid: boolean;
  result: number | null;
  formattedResult: string;
  hasOperators: boolean;
  isPartial: boolean;
}

/**
 * Cleanly evaluates financial arithmetic strings like:
 * - "150 + 45" -> 195
 * - "200 * 1.15" -> 230
 * - "500 + 15%" -> 575 (tax / VAT addition)
 * - "200 - 20%" -> 160 (discount subtraction)
 * - "1000 * 5%" -> 50
 * - "50 / 2" -> 25
 */
export function evaluateMathExpression(input: string): MathEvaluationResult {
  if (!input || !input.trim()) {
    return { isValid: false, result: null, formattedResult: '', hasOperators: false, isPartial: false };
  }

  const normalized = normalizeDigits(input).trim();
  const hasOperators = hasMathOperation(normalized);

  // If it's a simple single number without operators
  if (!hasOperators) {
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      return {
        isValid: true,
        result: parsed,
        formattedResult: parsed.toLocaleString('en-US', { maximumFractionDigits: 4 }),
        hasOperators: false,
        isPartial: false,
      };
    }
    return { isValid: false, result: null, formattedResult: '', hasOperators: false, isPartial: false };
  }

  // Check if string ends with a trailing operator like "150 +"
  const trailingOperator = /[\+\-\*\/]$/.test(normalized.trim());
  let sanitized = normalized;
  if (trailingOperator) {
    // Strip trailing operator for provisional preview
    sanitized = normalized.trim().slice(0, -1).trim();
  }

  try {
    const result = evaluateTokens(sanitized);
    if (result !== null && !isNaN(result) && isFinite(result)) {
      const rounded = Math.round(result * 10000) / 10000;
      return {
        isValid: !trailingOperator,
        result: rounded,
        formattedResult: rounded.toLocaleString('en-US', { maximumFractionDigits: 4 }),
        hasOperators: true,
        isPartial: trailingOperator,
      };
    }
  } catch {
    // Evaluation error on intermediate incomplete input
  }

  return {
    isValid: false,
    result: null,
    formattedResult: '',
    hasOperators: true,
    isPartial: true,
  };
}

/**
 * Tokenize and evaluate arithmetic expressions with financial percentage rules
 */
function evaluateTokens(expr: string): number | null {
  if (!expr.trim()) return null;

  // Handle percentage syntax transformations:
  // 1. "A + B%" => "A + (A * (B / 100))"
  // 2. "A - B%" => "A - (A * (B / 100))"
  // 3. "A * B%" => "A * (B / 100)"
  // 4. "A / B%" => "A / (B / 100)"
  // 5. Standalone "B%" => "(B / 100)"
  let transformed = expr;

  // Replace "A + B%"
  transformed = transformed.replace(
    /(\d+(?:\.\d+)?)\s*([\+\-])\s*(\d+(?:\.\d+)?)\s*%/g,
    (_, base, op, pct) => {
      const bNum = parseFloat(base);
      const pNum = parseFloat(pct);
      const delta = (bNum * pNum) / 100;
      return op === '+' ? `${bNum + delta}` : `${bNum - delta}`;
    }
  );

  // Replace "A * B%" or "A / B%"
  transformed = transformed.replace(
    /(\d+(?:\.\d+)?)\s*([\*\/])\s*(\d+(?:\.\d+)?)\s*%/g,
    (_, base, op, pct) => {
      const bNum = parseFloat(base);
      const pNum = parseFloat(pct) / 100;
      return op === '*' ? `${bNum * pNum}` : `${bNum / pNum}`;
    }
  );

  // Replace remaining standalone "B%"
  transformed = transformed.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, val) => {
    return `${parseFloat(val) / 100}`;
  });

  // Tokenize numbers and operators
  const tokens: (number | string)[] = [];
  const regex = /(\d+(?:\.\d+)?)|([\+\-\*\/\(\)])/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(transformed)) !== null) {
    if (match.index > lastIndex) {
      const skipped = transformed.substring(lastIndex, match.index).trim();
      if (skipped) return null; // Invalid character found
    }
    if (match[1] !== undefined) {
      tokens.push(parseFloat(match[1]));
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    }
    lastIndex = regex.lastIndex;
  }

  if (tokens.length === 0) return null;

  // Handle unary minus (e.g., "-5 + 10" or "10 * -2")
  const processedTokens: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;

    if (curr === '-' && (prev === null || prev === '(' || prev === '+' || prev === '-' || prev === '*' || prev === '/')) {
      const next = tokens[i + 1];
      if (typeof next === 'number') {
        processedTokens.push(-next);
        i++; // skip next
        continue;
      }
    }
    processedTokens.push(curr);
  }

  // Evaluate Multiplication and Division first, then Addition and Subtraction
  return computeSimpleTokens(processedTokens);
}

function computeSimpleTokens(tokens: (number | string)[]): number | null {
  // First pass: evaluate multiplication and division
  const pass1: (number | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === '*' || t === '/') {
      const prev = pass1.pop();
      const next = tokens[i + 1];
      if (typeof prev !== 'number' || typeof next !== 'number') {
        return null;
      }
      if (t === '/' && next === 0) {
        return null; // Division by zero
      }
      const res = t === '*' ? prev * next : prev / next;
      pass1.push(res);
      i += 2;
    } else {
      pass1.push(t);
      i++;
    }
  }

  // Second pass: evaluate addition and subtraction
  if (pass1.length === 0) return null;
  if (typeof pass1[0] !== 'number') return null;

  let total: number = pass1[0];
  let j = 1;
  while (j < pass1.length) {
    const op = pass1[j];
    const next = pass1[j + 1];
    if (typeof next !== 'number') return null;

    if (op === '+') {
      total += next;
    } else if (op === '-') {
      total -= next;
    } else {
      return null;
    }
    j += 2;
  }

  return total;
}
