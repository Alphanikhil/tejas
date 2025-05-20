import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    appType: "custom",
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server }
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production, client-side files are in the dist directory
  const distPath = path.resolve(import.meta.dirname, "..");
  const clientDistPath = path.resolve(distPath, "client");

  if (!fs.existsSync(clientDistPath)) {
    log(`Warning: Could not find the client build directory: ${clientDistPath}`, "express");
    log("Creating fallback client directory", "express");
    try {
      fs.mkdirSync(clientDistPath, { recursive: true });
    } catch (error) {
      log(`Error creating client directory: ${error}`, "express");
    }
  }

  log(`Serving static files from: ${clientDistPath}`, "express");
  
  // Configure Express static with proper MIME types
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      // Set correct MIME types for JavaScript modules
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      }
      
      // Cache settings for static assets
      if (filePath.match(/\.(js|css|jpg|jpeg|png|gif|ico|woff|woff2|ttf|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    // Check if index.html exists
    const indexPath = path.resolve(clientDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      log(`Warning: index.html not found at ${indexPath}`, "express");
      res.status(404).send("Application is still building. Please refresh in a moment.");
    }
  });
}
