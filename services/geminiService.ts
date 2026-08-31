import { Transaction, Category, ChatMessage, Goal, Wallet, Debt } from "../types";

export interface FinancialAIContext {
  currency: string;
  period: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  savingsRate: number;
  topExpenseCategories: { name: string; amount: number; percentage: number }[];
  walletSummary: { name: string; balance: number }[];
  debtSummary: { totalOwedToOthers: number; totalOwedByOthers: number; activeDebtsCount: number };
  goalSummary: { name: string; target: number; current: number; progressPercent: number }[];
}

export interface AIRequestPayload {
  message: string;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  financialContext: Partial<FinancialAIContext>;
  requestType: 'chat' | 'forecast' | 'goal_advice' | 'top_expenses';
}

export interface AIResponsePayload {
  text: string;
}

/**
 * Builds a privacy-filtered, aggregated Financial AI Context locally from the financial engine.
 * EXCLUDES all raw transaction notes, person names, phone numbers, receipt data, base64 images, internal IDs, and API keys.
 */
export const buildFinancialAIContext = (
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[] = [],
  debts: Debt[] = [],
  goals: Goal[] = [],
  currency: string = 'YER'
): FinancialAIContext => {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

  const catTotals: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
  });

  const topExpenseCategories = Object.entries(catTotals)
    .map(([id, amount]) => {
      const cat = categories.find(c => c.id === id);
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        name: cat?.name || 'عام',
        amount,
        percentage
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const walletSummary = wallets.map(w => ({
    name: w.name,
    balance: w.currentBalance ?? w.openingBalance ?? 0
  }));

  let totalOwedToOthers = 0;
  let totalOwedByOthers = 0;
  let activeDebtsCount = 0;

  debts.forEach(d => {
    if (!d.isPaid) {
      activeDebtsCount++;
      const remaining = d.amount - (d.paidAmount || 0);
      if (d.type === 'to_me') {
        totalOwedToOthers += remaining;
      } else {
        totalOwedByOthers += remaining;
      }
    }
  });

  const debtSummary = {
    totalOwedToOthers,
    totalOwedByOthers,
    activeDebtsCount
  };

  const goalSummary = goals.map(g => ({
    name: g.name,
    target: g.targetAmount,
    current: g.currentAmount,
    progressPercent: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
  }));

  return {
    currency,
    period: 'الوضع المالي الحالي (محدث)',
    totalIncome,
    totalExpense,
    netCashFlow,
    savingsRate,
    topExpenseCategories,
    walletSummary,
    debtSummary,
    goalSummary
  };
};

/**
 * Data Minimization per Intent: selects only relevant subset of financial context for each query type.
 */
export const buildAIContextForIntent = (
  intent: 'chat' | 'forecast' | 'goal_advice' | 'top_expenses',
  transactions: Transaction[],
  categories: Category[],
  wallets: Wallet[] = [],
  debts: Debt[] = [],
  goals: Goal[] = [],
  currency: string = 'YER'
): Partial<FinancialAIContext> => {
  const full = buildFinancialAIContext(transactions, categories, wallets, debts, goals, currency);
  switch (intent) {
    case 'top_expenses':
      return {
        currency: full.currency,
        totalExpense: full.totalExpense,
        topExpenseCategories: full.topExpenseCategories
      };
    case 'goal_advice':
      return {
        currency: full.currency,
        savingsRate: full.savingsRate,
        goalSummary: full.goalSummary
      };
    case 'forecast':
      return {
        currency: full.currency,
        totalIncome: full.totalIncome,
        totalExpense: full.totalExpense,
        netCashFlow: full.netCashFlow,
        savingsRate: full.savingsRate
      };
    case 'chat':
    default:
      return full;
  }
};

// Active request abort controller for cancellation and race condition prevention
let activeAiAbortController: AbortController | null = null;

const getAiApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_AI_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    const isProd = (import.meta as any).env?.PROD;
    if (isProd && (trimmed.includes('localhost') || trimmed.includes('127.0.0.1') || trimmed.startsWith('http://'))) {
      console.warn('[AI] Insecure or local AI API base URL in production environment');
      return '';
    }
    return trimmed;
  }
  return '';
};

/**
 * Secure backend proxy caller with strict error taxonomy, offline isolation, timeout (25s), and AbortController race protection.
 */
const callServerAI = async (
  payload: AIRequestPayload,
  systemInstruction: string
): Promise<string | null> => {
  // 1. Offline check
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.warn('[AI] unavailable (offline)');
    return null;
  }

  // Cancel previous pending request to prevent race conditions
  if (activeAiAbortController) {
    activeAiAbortController.abort();
  }
  const abortController = new AbortController();
  activeAiAbortController = abortController;

  const baseUrl = getAiApiBaseUrl();
  const endpoint = baseUrl ? `${baseUrl}/api/gemini` : '/api/gemini';

  const timeoutMs = 25000;
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  console.log('[AI] request started');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: payload.message,
        history: payload.history,
        financialContext: payload.financialContext,
        requestType: payload.requestType,
        systemInstruction,
        model: 'gemini-2.5-flash-latest'
      }),
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      console.warn('[AI] unauthorized / forbidden');
      return null;
    }
    if (response.status === 429) {
      console.warn('[AI] rate limited');
      return null;
    }
    if (response.status >= 500) {
      console.warn('[AI] server error', response.status);
      return null;
    }

    if (!response.ok) {
      console.warn('[AI] unavailable', response.status);
      return null;
    }

    const data: AIResponsePayload = await response.json();
    if (!data || typeof data.text !== 'string') {
      console.warn('[AI] malformed response contract');
      return null;
    }

    console.log('[AI] success');
    return data.text;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError' || abortController.signal.aborted) {
      console.warn('[AI] timeout or aborted');
      return null;
    }
    console.warn('[AI] unavailable:', err?.message || err);
    return null;
  } finally {
    if (activeAiAbortController === abortController) {
      activeAiAbortController = null;
    }
  }
};

export const chatWithThari = async (
  userMessage: string,
  history: ChatMessage[],
  contextData: { transactions: Transaction[], categories: Category[], currency: string, wallets?: Wallet[], debts?: Debt[], goals?: Goal[] },
  apiKey?: string // kept for interface compatibility, strictly unused for security
): Promise<string> => {
  const intent = userMessage.includes('صرف') || userMessage.includes('أكثر') ? 'top_expenses' : 'chat';
  const minimizedContext = buildAIContextForIntent(
    intent,
    contextData.transactions,
    contextData.categories,
    contextData.wallets || [],
    contextData.debts || [],
    contextData.goals || [],
    contextData.currency
  );

  const systemInstruction = `أنت "ثري"، المستشار المالي الذكي. 
إليك الملخص المالي المجمّع والمفلتر بدقة للمستخدم (بدون أي بيانات خام، معاملاعات، أو معلومات شخصية):
- العملة: ${minimizedContext.currency || contextData.currency}
- الإيرادات والمصروفات: ${JSON.stringify(minimizedContext)}

التعليمات:
1. قدم تحليلات وتوصيات بناءً على الملخص أعلاه حصراً.
2. لا تقم أبداً بتخمير أو حساب الأرصدة من المعاملات الخام.
3. كن مختصراً، احترافياً، وبصوت ودي باللغة العربية.`;

  const payload: AIRequestPayload = {
    message: userMessage,
    history: history.slice(-10).map(msg => ({
      role: msg.role === 'model' ? 'model' : ('user' as const),
      parts: [{ text: msg.text }]
    })),
    financialContext: minimizedContext,
    requestType: intent
  };

  const aiResponse = await callServerAI(payload, systemInstruction);
  if (!aiResponse) {
    return "الاستشارة الذكية غير متاحة حاليًا لعدم توفر الاتصال.";
  }

  return aiResponse;
};

export const getFinancialForecast = async (
  transactions: Transaction[],
  currency: string,
  apiKey?: string,
  categories: Category[] = [],
  wallets: Wallet[] = [],
  debts: Debt[] = [],
  goals: Goal[] = []
): Promise<{ projectedBalance: number; insight: string; savingPotential: string } | null> => {
  const minimizedContext = buildAIContextForIntent('forecast', transactions, categories, wallets, debts, goals, currency);
  const payload: AIRequestPayload = {
    message: `توليد توقع مالي للـ 6 أشهر القادمة`,
    history: [],
    financialContext: minimizedContext,
    requestType: 'forecast'
  };

  const systemInstruction = `أنت محلل مالي خبير. قم بتوليد توقع مالي للـ 6 أشهر القادمة بناءً على الملخص المالي المزوّد بصيغة JSON حصراً بالشكل التالي:
{
  "projectedBalance": number,
  "insight": "نصيحة مالية دقيقة",
  "savingPotential": "مبلغ مقترح للتوفير شهرياً"
}`;

  const text = await callServerAI(payload, systemInstruction);
  if (!text) return null;
  try {
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return null;
  }
};

export const getGoalAdvice = async (
  goal: Goal,
  transactions: Transaction[],
  currency: string,
  apiKey?: string,
  categories: Category[] = [],
  wallets: Wallet[] = [],
  debts: Debt[] = []
): Promise<string> => {
  const minimizedContext = buildAIContextForIntent('goal_advice', transactions, categories, wallets, debts, [goal], currency);
  const payload: AIRequestPayload = {
    message: `تقديم نصيحة للهدف: ${goal.name}`,
    history: [],
    financialContext: minimizedContext,
    requestType: 'goal_advice'
  };

  const systemInstruction = `أنت مستشار مالي شخصي. قدم نصيحة واحدة فخمة ومختصرة للوصول للهدف بناءً على المعطيات المالية المجمّعة.`;

  const text = await callServerAI(payload, systemInstruction);
  return text || "الاستمرار في الادخار المنضبط هو أقصر طريق لتحقيق أهدافك.";
};
