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
  // Try multiple possible build output directories
  const possibleDirs = [
    // Primary location - dist/client is where Vite builds to
    path.resolve(import.meta.dirname, "../dist/client"),
    // Secondary location - sometimes files are copied directly to dist
    path.resolve(import.meta.dirname, "../dist"),
    // Tertiary location - might be in client directory directly
    path.resolve(import.meta.dirname, "../client"),
    // Last resort location - try the current working directory
    path.resolve(process.cwd(), "client")
  ];
  
  // Find the first directory that exists and has an index.html file
  let clientDistPath = null;
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, "index.html"))) {
      clientDistPath = dir;
      log(`Found client files at: ${clientDistPath}`, "express");
      break;
    } else {
      log(`Checked path ${dir} - directory or index.html not found`, "express");
    }
  }
  
  // If no directory with index.html was found, use the first directory that exists
  if (!clientDistPath) {
    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        clientDistPath = dir;
        log(`No index.html found, using directory: ${clientDistPath}`, "express");
        break;
      }
    }
  }
  
  // If no directory was found, create one as a last resort
  if (!clientDistPath) {
    clientDistPath = possibleDirs[0];
    log(`Warning: Could not find any client build directory, creating: ${clientDistPath}`, "express");
    try {
      fs.mkdirSync(clientDistPath, { recursive: true });
    } catch (error) {
      log(`Error creating client directory: ${error}`, "express");
    }
  }
  
  // Log directory contents for debugging
  log(`Serving static files from: ${clientDistPath}`, "express");
  try {
    const files = fs.readdirSync(clientDistPath);
    log(`Found ${files.length} files in client directory: ${files.join(", ")}`, "express");
  } catch (error) {
    log(`Error reading client directory: ${error}`, "express");
  }
  
  // Configure Express static with proper MIME types
  app.use(express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      // Set correct MIME types for JavaScript modules
      if (filePath.endsWith('.js')) {
        log(`Setting MIME type for JavaScript file: ${filePath}`, "express");
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      }
      
      // Force no caching during development
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
  
  // Check for assets directory and serve it specifically if it exists
  const assetsPath = path.resolve(clientDistPath, "assets");
  if (fs.existsSync(assetsPath)) {
    log(`Found assets directory at: ${assetsPath}`, "express");
    app.use("/assets", express.static(assetsPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
        res.setHeader('Cache-Control', 'no-cache');
      }
    }));
  }

  // Add a rule specifically for JavaScript files
  app.get('*.js', (req, res, next) => {
    log(`Setting Content-Type for JS file: ${req.path}`, "express");
    res.set('Content-Type', 'application/javascript');
    next();
  });
  
  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(clientDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      log(`Serving index.html from: ${indexPath}`, "express");
      res.sendFile(indexPath);
    } else {
      log(`Warning: index.html not found at ${indexPath}`, "express");
      res.status(404).send(
        "<html><body style='font-family: Arial, sans-serif; text-align: center; padding: 50px;'>"
        + "<h1>Application is still building</h1>"
        + "<p>The application is still initializing or there may be an issue with the build. Please refresh in a moment.</p>"
        + "<p>If this persists, check the application logs for more information.</p>"
        + "</body></html>"
      );
    }
  });
}
