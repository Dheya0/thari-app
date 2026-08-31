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

  // Top expense categories (aggregated, no transaction notes or personal info)
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

  // Wallet summary (names and balances only, no sensitive info)
  const walletSummary = wallets.map(w => ({
    name: w.name,
    balance: w.currentBalance ?? w.openingBalance ?? 0
  }));

  // Debt summary (aggregated totals and count only - NO person names, NO phone numbers, NO notes!)
  let totalOwedToOthers = 0; // 'to_me' (money owed to user)
  let totalOwedByOthers = 0; // 'on_me' (money user owes)
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

  // Goal summary
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

// Secure backend proxy caller (no client-side API keys exposed)
const callServerAI = async (contents: any, systemInstruction: string) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction, model: 'gemini-2.5-flash-latest' })
    });

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    return data.text || null;
  } catch (err) {
    console.warn('AI proxy unavailable or offline:', err);
    return null;
  }
};

export const chatWithThari = async (
  userMessage: string,
  history: ChatMessage[],
  contextData: { transactions: Transaction[], categories: Category[], currency: string, wallets?: Wallet[], debts?: Debt[], goals?: Goal[] },
  apiKey?: string // kept for interface compatibility, but unused to prevent exposing secrets
) => {
  const financialContext = buildFinancialAIContext(
    contextData.transactions,
    contextData.categories,
    contextData.wallets || [],
    contextData.debts || [],
    contextData.goals || [],
    contextData.currency
  );

  const systemInstruction = `أنت "ثري"، المستشار المالي الذكي. 
إليك الملخص المالي المحسوب محلياً للمستخدم (بدون بيانات خام أو معلومات شخصية أو ملاحظات معاملات):
- العملة: ${financialContext.currency}
- إجمالي الإيرادات: ${financialContext.totalIncome}
- إجمالي المصروفات: ${financialContext.totalExpense}
- صافي التدفق النقدي: ${financialContext.netCashFlow}
- نسبة الادخار: ${financialContext.savingsRate}%
- أعلى تصنيفات المصروفات: ${JSON.stringify(financialContext.topExpenseCategories)}
- ملخص المحافظ: ${JSON.stringify(financialContext.walletSummary)}
- ملخص الديون (مجمّع بدون أسماء أشخاص): ${JSON.stringify(financialContext.debtSummary)}
- ملخص الأهداف المالية: ${JSON.stringify(financialContext.goalSummary)}

التعليمات:
1. قدم تحليلات مالية وتوصيات بناءً على الملخص أعلاه حصراً.
2. لا تحاول حساب الأرصدة أو جمع المعاملات بنفسك، استخدم الأرقام المقدمة.
3. كن مختصراً، احترافياً، وبصوت ودي باللغة العربية.`;

  const contents = [
    ...history.slice(-10).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user' as const,
      parts: [{ text: msg.text }]
    })),
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const aiResponse = await callServerAI(contents, systemInstruction);
  if (!aiResponse) {
    return "عذراً، الاستشارة الذكية عبر الإنترنت غير متوفرة حالياً (وضع عدم الاتصال نشط أو الخدمة غير متصلة). يمكنك الاعتماد على التحليلات المحلية والتقارير في التطبيق.";
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
) => {
  const fc = buildFinancialAIContext(transactions, categories, wallets, debts, goals, currency);
  const contents = `بناءً على الملخص المالي المحسوب: [إيرادات: ${fc.totalIncome}, مصروفات: ${fc.totalExpense}, صافي: ${fc.netCashFlow}, معدل الادخار: ${fc.savingsRate}%]، قم بتوليد توقع مالي للـ 6 أشهر القادمة بصيغة JSON حصراً:
{
  "projectedBalance": number,
  "insight": "نصيحة مالية دقيقة",
  "savingPotential": "مبلغ مقترح للتوفير شهرياً"
}`;

  const text = await callServerAI(contents, "أنت محلل مالي خبير تجيب بصيغة JSON حصراً.");
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
) => {
  const fc = buildFinancialAIContext(transactions, categories, wallets, debts, [goal], currency);
  const progress = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
  const contents = `الهدف: ${goal.name}, المستهدف: ${goal.targetAmount}, الحالي: ${goal.currentAmount} (${progress}%). معدل الادخار العام: ${fc.savingsRate}%. قدم نصيحة واحدة فخمة ومختصرة للوصول للهدف.`;

  const text = await callServerAI(contents, "أنت مستشار مالي شخصي.");
  return text || "الاستمرار في الادخار المنضبط هو أقصر طريق لتحقيق أهدافك.";
};
