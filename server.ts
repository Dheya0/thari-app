import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { sanitizeAndRedact } from "./utils/sanitize";

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

  // Security headers via helmet with CSP configured for app & AI proxy
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // Limit body size to prevent memory/DoS attacks (16kb max for AI requests)
  app.use(express.json({ limit: '16kb' }));

  // Rate limiter for AI proxy endpoint
  const geminiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests from this IP, please try again after 15 minutes." }
  });

  // Pluggable Authentication Middleware
  const authenticateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const appToken = req.headers['x-app-token'];
    const expectedToken = process.env.APP_AUTH_TOKEN || 'thari-secure-dev-token';

    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof appToken === 'string') {
      token = appToken;
    }

    // In production mode, if APP_AUTH_TOKEN is enforced, validate token
    if (process.env.NODE_ENV === 'production' && process.env.APP_AUTH_TOKEN && !token) {
      return res.status(401).json({ error: 'Unauthorized: Missing required app token' });
    }

    if (token && process.env.APP_AUTH_TOKEN && token !== expectedToken && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized: Invalid app token' });
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

      // 3. Log filtered telemetry (no full prompt content, no apiKey, no user PII)
      console.info(JSON.stringify({
        event: 'ai_request',
        meta: {
          userId: req.headers['x-user-id'] || 'anonymous',
          model: DEFAULT_MODEL,
          requestType: requestType || 'chat',
          timestamp: new Date().toISOString()
        }
      }));

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

      const rawText = response.text || '';

      // 4. Secure response parsing: extract JSON if embedded or validate text output
      let responsePayload = { text: rawText };
      const jsonMatch = rawText.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsedJson = JSON.parse(jsonMatch[1].trim());
          responsePayload.text = JSON.stringify(parsedJson);
        } catch {
          // Keep raw text if JSON parse fails
        }
      }

      const validationResult = AIResponseSchema.safeParse(responsePayload);
      if (!validationResult.success) {
        return res.status(502).json({ error: "Invalid AI response structure" });
      }

      res.json(validationResult.data);
    } catch (error: any) {
      console.error("Server AI proxy error:", error);
      res.status(500).json({ error: "Failed to generate AI content" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
