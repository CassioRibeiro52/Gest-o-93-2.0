import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import history from "connect-history-api-fallback";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes MUST come before history fallback
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Explicitly serve PWA files
  const servePwaFile = (fileName: string, res: express.Response) => {
    const distPath = path.join(process.cwd(), "dist", fileName);
    const publicPath = path.join(process.cwd(), "public", fileName);
    
    // Try dist first, then public
    res.sendFile(distPath, (err) => {
      if (err) {
        res.sendFile(publicPath, (err2) => {
          if (err2) {
            res.status(404).send(`${fileName} not found`);
          }
        });
      }
    });
  };

  app.get("/manifest.json", (req, res) => servePwaFile("manifest.json", res));
  app.get("/sw.js", (req, res) => {
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    servePwaFile("sw.js", res);
  });

  if (process.env.NODE_ENV !== "production") {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const rootIndex = path.join(process.cwd(), "index.html");
    
    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      // Try dist/index.html, then root index.html
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.sendFile(rootIndex, (err2) => {
            if (err2) {
              res.status(404).send("Erro 404: Arquivo index.html não encontrado no servidor.");
            }
          });
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
