import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";

export function createApp() {
  const app = express();

  const isProduction = process.env.NODE_ENV === 'production';

  // Body parser limit
  app.use(express.json({ limit: '64kb' }));

  // Helmet + Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // handled manually via nonce middleware
    crossOriginEmbedderPolicy: false
  }));

  // Additional security headers
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
      `style-src 'self' 'nonce-${nonce}'`,
      `font-src 'self'`,
      `img-src 'self' data: blob:`,
      `connect-src 'self'`
    ].join('; ') : [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline' 'nonce-${nonce}'`,
      `font-src 'self'`,
      `img-src 'self' data: blob:`,
      `connect-src 'self' 'unsafe-eval'`
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
    next();
  };

  app.use(generateNonce);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
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
          const nonce = res.locals.cspNonce || '';
          template = template.replace(/%CSP_NONCE%/g, nonce);
          let html = await vite.transformIndexHtml(req.originalUrl, template);
          html = html
            .replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`)
            .replace(/<style\b(?![^>]*\bnonce=)/gi, `<style nonce="${nonce}"`);
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
