
import { GoogleGenAI } from "@google/genai";
import { Transaction, Category, ChatMessage, Goal } from "../types";

// Helper to get AI instance with user provided key
const getAI = (userKey?: string) => {
  let envKey = '';
  try {
    if (typeof process !== 'undefined' && process.env) {
      envKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    }
  } catch (e) {}

  if (!envKey) {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        envKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
      }
    } catch (e) {}
  }

  const apiKey = (userKey && userKey.trim() !== '') ? userKey.trim() : envKey;
  
  if (!apiKey || apiKey.trim() === '') {
    return null; 
  }
  return new GoogleGenAI({ apiKey });
};

export const chatWithThari = async (
  userMessage: string, 
  history: ChatMessage[], 
  context: { transactions: Transaction[], categories: Category[], currency: string },
  apiKey?: string
) => {
  const ai = getAI(apiKey);
  
  if (!ai) {
    return "عذراً، لا يمكنني العمل بدون مفتاح API. يرجى إضافته في الإعدادات.";
  }

  // Prepare context summary
  const summary = context.transactions.slice(0, 40).map(t => {
    const cat = context.categories.find(c => c.id === t.categoryId);
    return `[${t.date}] ${t.type}: ${t.amount} (${cat?.name || 'عام'}) - ${t.note || ''}`;
  }).join('\n');

  const systemInstruction = `أنت "ثري"، المستشار المالي الشخصي. 
  لديك سجل العمليات المالية للمستخدم أدناه.
  استخدم هذه البيانات للإجابة بدقة وتحليل الوضع المالي.
  
  السجل المالي الأخير:
  ${summary}
  
  العملة المستخدمة: ${context.currency}
  
  التعليمات:
  1. كن مفيداً، مختصراً، واستخدم لغة عربية راقية وودودة.
  2. إذا سأل المستخدم عن رصيده أو مصاريفه، احسبها بدقة من البيانات أعلاه.
  3. قدم نصائح للادخار بناءً على نمط إنفاقه.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest', // Using Flash for speed/cost effectiveness in chat
      contents: [
        ...history.slice(-10).map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user' as const,
          parts: [{ text: msg.text }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: { 
        systemInstruction,
        temperature: 0.7,
      }
    });
    
    return response.text || "لم أستطع تكوين إجابة، حاول صياغة السؤال بطريقة أخرى.";

  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes('403') || error.message?.includes('API key')) {
        return "حدث خطأ في المصادقة. تأكد من صحة مفتاح API في الإعدادات.";
    }
    return "واجهت مشكلة تقنية في الاتصال بالخدمة. يرجى المحاولة لاحقاً.";
  }
};

/**
 * محاكاة المستقبل المالي بناءً على البيانات الحالية
 */
export const getFinancialForecast = async (transactions: Transaction[], currency: string, apiKey?: string) => {
  const ai = getAI(apiKey);
  if (!ai) return null;

  const summary = transactions.slice(0, 50).map(t => `${t.type}: ${t.amount}`).join(', ');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: `بناءً على تاريخ العمليات المالي التالي: [${summary}]، قم بإنتاج توقع مالي لـ 6 أشهر القادمة.
أجب بتنسيق JSON حصراً:
{
  "projectedBalance": number,
  "insight": "نصيحة فخمة جداً ومختصرة"،
  "savingPotential": "مبلغ يمكن توفيره شهرياً"
}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  } catch {
    return null;
  }
};

/**
 * تحسين الوصول للأهداف المالية
 */
export const getGoalAdvice = async (goal: Goal, transactions: Transaction[], currency: string, apiKey?: string) => {
  const ai = getAI(apiKey);
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: `الهدف: ${goal.name}, المبلغ المطلوب: ${goal.targetAmount}, المبلغ الحالي: ${goal.currentAmount}.
قدم نصيحة واحدة فخمة جداً (أقل من 15 كلمة) للوصول للهدف.`,
    });
    return response.text;
  } catch {
    return "الاستمرار في العادات المالية الصحيحة هو مفتاح الثروة.";
  }
};
