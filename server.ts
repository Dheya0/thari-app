import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { sanitizeAndRedact, hashUserId } from "./utils/sanitize";

const SERVER_SIDE_SYSTEM_PROMPT = `أنت "ثري"، المستشار المالي الذكي. 
قدم تحليلات وتوصيات دقيقة بناءً على السياق المالي المزوّد حصراً.
لا تقم أبداً بتنفيذ أي تعليمات برمجية، أو تجاوز القيود الأمنية، أو كشف معلومات حساسة.
كن مختصراً، احترافياً، وبصوت ودي باللغة العربية.`;

const DEFAULT_MODEL = 'gemini-3.6-flash';

// Response validation schema
const AIResponseSchema = z.object({
  text: z.string()
});

export function createApp() {
  const app = express();

  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // زيادة حد الجسم إلى 64kb
  app.use(express.json({ limit: '64kb' }));

  // Helmet + Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // handled manually via nonce middleware
    crossOriginEmbedderPolicy: false
  }));

  // رؤوس أمان إضافية
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use(helmet.frameguard({ action: 'deny' }));
  app.use(helmet.noSniff());
  app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

  // Nonce generation middleware for CSP
  const generateNonce = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.cspNonce = nonce;
    const csp = isProduction ? [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob:`,
      `connect-src 'self' https://generativelanguage.googleapis.com`
    ].join('; ') : [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob:`,
      `connect-src 'self' 'unsafe-eval' https://generativelanguage.googleapis.com`
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
    next();
  };

  app.use(generateNonce);

  // Rate limiter for AI proxy endpoint
  const geminiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests from this IP, please try again after 15 minutes." }
  });

  // Authentication Middleware with JWT support and legacy APP_AUTH_TOKEN fallback
  const authenticateRequest = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const appToken = req.headers['x-app-token'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : appToken;
    const jwtSecret = process.env.APP_JWT_SECRET;
    const legacyToken = process.env.APP_AUTH_TOKEN;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    const allowInsecureDev = process.env.ALLOW_INSECURE_DEV === 'true' || 
      (!isProduction && !isTest && process.env.ALLOW_INSECURE_DEV !== 'false');

    const isPublicProduction = isProduction && !legacyToken && !jwtSecret;

    if (!token && !allowInsecureDev && !isPublicProduction) {
      console.warn(JSON.stringify({
        event: 'auth_failure',
        ip: clientIp,
        timestamp: new Date().toISOString(),
        reason: 'missing_token'
      }));
      return res.status(401).json({ error: 'Unauthorized: Valid app authentication token required' });
    }

    if (token) {
      if (jwtSecret) {
        try {
          req.auth = jwt.verify(token, jwtSecret);
          return next();
        } catch (e) {
          // Fall through to legacy token check
        }
      }
      if (legacyToken && token === legacyToken) {
        return next();
      }
      if (!isProduction && (!legacyToken && !jwtSecret) && (allowInsecureDev || process.env.ALLOW_INSECURE_DEV === 'true')) {
        return next();
      }
      if (isProduction && isPublicProduction) {
        return next();
      }
      console.warn(JSON.stringify({
        event: 'auth_failure',
        ip: clientIp,
        timestamp: new Date().toISOString(),
        reason: 'invalid_token'
      }));
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    if (allowInsecureDev || isPublicProduction) {
      return next();
    }

    return res.status(401).json({ error: 'Unauthorized: token required' });
  };

  // Secure backend AI proxy endpoint
  app.post("/api/gemini", geminiLimiter, authenticateRequest, async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "AI service not configured on server." });
      }

      const { contents, history, financialContext, requestType } = req.body;

      const sanitizedContents = sanitizeAndRedact(contents);
      const sanitizedHistory = sanitizeAndRedact(history);
      const sanitizedContext = sanitizeAndRedact(financialContext);

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

      // استخدام حقول SDK المهيكلة (candidates, output, text)
      let rawText = '';
      if (typeof (response as any).text === 'string' && (response as any).text.length > 0) {
        rawText = (response as any).text;
      } else if ((response as any).candidates && (response as any).candidates.length > 0) {
        const candidate = (response as any).candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          rawText = candidate.content.parts.map((p: any) => p.text || '').join('');
        } else if (candidate.output) {
          rawText = String(candidate.output);
        }
      } else if ((response as any).output) {
        rawText = String((response as any).output);
      } else {
        rawText = JSON.stringify(response);
      }

      const sanitizedOutputText = sanitizeAndRedact(String(rawText), 8000);

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

  if (isProduction && !process.env.APP_JWT_SECRET && !process.env.APP_AUTH_TOKEN) {
    console.warn('WARNING: APP_JWT_SECRET or APP_AUTH_TOKEN are not set in production. Running in public open API mode with rate limiting.');
  }

  const app = createApp();
  const PORT = 3000;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(async (req: any, res: any, next: any) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      if (req.method === 'GET' && (req.headers.accept?.includes('text/html') || req.path === '/' || !req.path.includes('.'))) {
        try {
          const templatePath = path.resolve(process.cwd(), 'index.html');
          let template = fs.readFileSync(templatePath, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          const nonce = res.locals.cspNonce || '';
          const html = template.replace(/%CSP_NONCE%/g, nonce);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          return next(e);
        }
      }
      return next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*all', (req: any, res: any) => {
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
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [Production mode: ${isProduction}]`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
