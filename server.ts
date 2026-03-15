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

  // Explicitly serve PWA files for both dev and prod
  app.get("/manifest.json", (req, res) => {
    const p = process.env.NODE_ENV === "production" 
      ? path.join(process.cwd(), "dist", "manifest.json")
      : path.join(process.cwd(), "public", "manifest.json");
    res.sendFile(p);
  });

  app.get("/sw.js", (req, res) => {
    const p = process.env.NODE_ENV === "production" 
      ? path.join(process.cwd(), "dist", "sw.js")
      : path.join(process.cwd(), "public", "sw.js");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(p);
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
    
    // 1. Serve static files first (css, js, images)
    app.use(express.static(distPath));

    // 2. API routes (already handled above, but good to keep in mind)

    // 3. Fallback for SPA: any other route serves index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.status(404).send("Aplicação não encontrada. Por favor, recarregue a página.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
