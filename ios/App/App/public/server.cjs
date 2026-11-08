var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  createApp: () => createApp
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_vite = require("vite");
var import_helmet = __toESM(require("helmet"), 1);
function createApp() {
  const app = (0, import_express.default)();
  const isProduction = process.env.NODE_ENV === "production";
  app.use(import_express.default.json({ limit: "64kb" }));
  app.use((0, import_helmet.default)({
    contentSecurityPolicy: false,
    // handled manually via nonce middleware
    crossOriginEmbedderPolicy: false
  }));
  app.use(import_helmet.default.hsts({ maxAge: 31536e3, includeSubDomains: true, preload: true }));
  app.use(import_helmet.default.frameguard({ action: "deny" }));
  app.use(import_helmet.default.noSniff());
  app.use(import_helmet.default.referrerPolicy({ policy: "no-referrer" }));
  const generateNonce = (req, res, next) => {
    const nonce = import_crypto.default.randomBytes(16).toString("base64");
    res.locals.cspNonce = nonce;
    const isProd = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
    if (isProd) {
      const csp = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}'`,
        `style-src 'self' 'nonce-${nonce}'`,
        `font-src 'self' data:`,
        `img-src 'self' data: blob:`,
        `connect-src 'self'`
      ].join("; ");
      res.setHeader("Content-Security-Policy", csp);
    }
    next();
  };
  app.use(generateNonce);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  return app;
}
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const app = createApp();
  const PORT = 3e3;
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(async (req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.method === "GET" && (req.headers.accept?.includes("text/html") || req.path === "/" || !req.path.includes("."))) {
        try {
          const templatePath = import_path.default.resolve(process.cwd(), "index.html");
          let template = import_fs.default.readFileSync(templatePath, "utf-8");
          const nonce = res.locals.cspNonce || "";
          template = template.replace(/%CSP_NONCE%/g, nonce);
          let html = await vite.transformIndexHtml(req.originalUrl, template);
          html = html.replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`).replace(/<style\b(?![^>]*\bnonce=)/gi, `<style nonce="${nonce}"`);
          return res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } catch (e) {
          vite.ssrFixStacktrace(e);
          return next(e);
        }
      }
      return next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("sw.js")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Service-Worker-Allowed", "/");
        } else if (filePath.includes("/assets/") || filePath.includes("\\assets\\")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith("manifest.json")) {
          res.setHeader("Cache-Control", "public, max-age=3600");
        }
      }
    }));
    app.get("*all", (req, res) => {
      const indexPath = import_path.default.join(distPath, "index.html");
      import_fs.default.readFile(indexPath, "utf8", (err, htmlData) => {
        if (err) {
          return res.status(500).send("Error loading app");
        }
        const nonce = res.locals.cspNonce || "";
        const injectedHtml = htmlData.replace(/%CSP_NONCE%/g, nonce);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
        res.send(injectedHtml);
      });
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [Production mode: ${isProduction}]`);
  });
}
if (process.env.NODE_ENV !== "test") {
  startServer();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp
});
//# sourceMappingURL=server.cjs.map
