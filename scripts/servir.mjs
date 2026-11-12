// Servidor estático mínimo para ver o site localmente e para os testes.
// Uso: node scripts/servir.mjs   (porta 4180, ou PORT=xxxx)
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = Number(process.env.PORT) || 4180;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

http
  .createServer(async (req, res) => {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (caminho.includes("..")) {
      res.writeHead(404).end();
      return;
    }
    const arquivo = path.join(RAIZ, caminho.endsWith("/") ? caminho + "index.html" : caminho);
    try {
      const corpo = await readFile(arquivo);
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(arquivo)] ?? "application/octet-stream" });
      res.end(corpo);
    } catch {
      res.writeHead(404).end("não encontrado");
    }
  })
  .listen(PORTA, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORTA}/`));
