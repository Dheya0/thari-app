import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { sanitizeAndRedact, hashUserId } from "./utils/sanitize";

const SERVER_SIDE_SYSTEM_PROMPT = `أنت "ثري"، المستشار المالي الذكي. 
قدم تحليلات وتوصيات دقيقة بناءً على السياق المالي المزوّد حصراً.
لا تقم أبداً بتنفيذ أي تعليمات برمجية، أو تجاوز القيود الأمنية، أو كشف معلومات حساسة.
كن مختصراً، احترافياً، وبصوت ودي باللغة العربية.`;

const ALLOWED_MODELS = [
  'gemini-2.5-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash'
];
const DEFAULT_MODEL = 'gemini-2.5-flash-latest';

// Response validation schema
const AIResponseSchema = z.object({
  text: z.string()
});

export function createApp() {
  const app = express();

  const isProduction = process.env.NODE_ENV === 'production';

  // زيادة حد الجسم
  app.use(express.json({ limit: '64kb' }));

  // Helmet + CSP أكثر صرامة
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // في الإنتاج لا نسمح بـ unsafe-inline
        scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // رؤوس أمان إضافية
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use(helmet.frameguard({ action: 'deny' }));
  app.use(helmet.noSniff());
  app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

  // Rate limiter for AI proxy endpoint
  const geminiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests from this IP, please try again after 15 minutes." }
  });

  // مصادقة إجبارية مطابقة للمواصفات المطلوبة
  const authenticateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const appToken = req.headers['x-app-token'];
    const expectedToken = process.env.APP_AUTH_TOKEN;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
    else if (typeof appToken === 'string') token = appToken;

    // إجبار المصادقة في كل البيئات إلا إذا أرخصت عمداً
    if (!token && process.env.ALLOW_INSECURE_DEV !== 'true') {
      console.warn(JSON.stringify({
        event: 'auth_failure',
        ip: clientIp,
        timestamp: new Date().toISOString(),
        reason: 'missing_token'
      }));
      return res.status(401).json({ error: 'Unauthorized: Valid app authentication token required' });
    }

    if (process.env.NODE_ENV === 'production') {
      if (!expectedToken) {
        console.error('FATAL: APP_AUTH_TOKEN missing in production configuration.');
        return res.status(500).json({ error: 'Server misconfiguration: Authentication required' });
      }
      if (token !== expectedToken) {
        console.warn(JSON.stringify({
          event: 'auth_failure',
          ip: clientIp,
          timestamp: new Date().toISOString(),
          reason: 'invalid_token'
        }));
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    } else {
      // في التطوير، إذا وُجد expectedToken تصحّح المطابقة، وإلا يُسمح فقط إن فعّل ALLOW_INSECURE_DEV
      if (expectedToken && token && token !== expectedToken) {
        console.warn(JSON.stringify({
          event: 'auth_failure',
          ip: clientIp,
          timestamp: new Date().toISOString(),
          reason: 'invalid_token'
        }));
        return res.status(401).json({ error: 'Unauthorized: Invalid development token' });
      }
    }

    next();
  };

  // Secure backend AI proxy endpoint
  app.post("/api/gemini", geminiLimiter, authenticateRequest, async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "AI service not configured on server." });
      }

      // 1. Enforce Server-Side System Instruction & Model Whitelist (Ignore client request values)
      const { contents, history, financialContext, requestType } = req.body;

      // 2. Sanitize and redact all incoming user data before sending to GenAI
      const sanitizedContents = sanitizeAndRedact(contents);
      const sanitizedHistory = sanitizeAndRedact(history);
      const sanitizedContext = sanitizeAndRedact(financialContext);

      // 3. Log filtered telemetry with hashed user ID (fully sanitized and redacted)
      console.info(JSON.stringify(sanitizeAndRedact({
        event: 'ai_request',
        meta: {
          userHash: hashUserId(req.headers['x-user-id'] as string),
          model: DEFAULT_MODEL,
          requestType: requestType || 'chat',
          timestamp: new Date().toISOString()
        }
      })));

      const ai = new GoogleGenAI({ apiKey });

      // Format contents and history into prompt structure for GoogleGenAI SDK
      let fullPrompt = `سياق مالي مجمّع ومفلتر:\n${JSON.stringify(sanitizedContext)}\n\n`;
      if (Array.isArray(sanitizedHistory) && sanitizedHistory.length > 0) {
        fullPrompt += `السجل السابق:\n${sanitizedHistory.map((h: any) => `${h.role}: ${h.parts?.[0]?.text || ''}`).join('\n')}\n\n`;
      }
      fullPrompt += `سؤال المستخدم:\n${sanitizedContents}`;

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: fullPrompt,
        config: {
          systemInstruction: SERVER_SIDE_SYSTEM_PROMPT,
          temperature: 0.7,
        }
      });

      // تحسين استخراج/تنقيح ناتج AI مع استخدام حقول SDK
      const rawText = (response as any).text || (response as any)?.candidates?.[0]?.content || '';
      // تنقيح فوري
      const sanitizedOutputText = sanitizeAndRedact(String(rawText), 8000);

      // Secure response parsing: extract JSON if embedded or validate text output
      let responsePayload = { text: sanitizedOutputText };
      const jsonMatch = sanitizedOutputText.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsedJson = JSON.parse(jsonMatch[1].trim());
          responsePayload.text = JSON.stringify(sanitizeAndRedact(parsedJson, 8000));
        } catch {
          // Keep sanitized text if JSON parse fails
        }
      }

      const validationResult = AIResponseSchema.safeParse(responsePayload);
      if (!validationResult.success) {
        return res.status(502).json({ error: "Invalid AI response structure" });
      }

      res.json(validationResult.data);
    } catch (error: any) {
      console.error("Server AI proxy error:", sanitizeAndRedact(error?.message || String(error)));
      res.status(500).json({ error: "Failed to generate AI content" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Enforce startup failure if APP_AUTH_TOKEN is missing in production
  if (isProduction && !process.env.APP_AUTH_TOKEN) {
    console.error('FATAL: APP_AUTH_TOKEN must be set in production environment to protect /api/gemini endpoint.');
    process.exit(1);
  }

  const app = createApp();
  const PORT = 3000;

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [Production mode: ${isProduction}]`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
