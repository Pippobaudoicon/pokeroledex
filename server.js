import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./server/api.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (url.pathname.startsWith("/api/")) {
      // Local JSON endpoints only. No requests are forwarded to the live site.
      if (req.headers.origin && ![`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(req.headers.origin)) {
        res.writeHead(403).end("Local requests only");
        return;
      }
      await handleApi(req, res, url);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const isSource = pathname.startsWith("/src/");
    const base = resolve(root, isSource ? "src" : "public");
    const relative = isSource ? pathname.slice(5) : pathname.slice(1);
    let file = resolve(base, relative);
    if (!file.startsWith(base + sep)) {
      if (pathname !== "/") {
        res.writeHead(404).end("Not found");
        return;
      }
    }
    // Browser routes load the same app; missing assets remain honest 404s.
    if (!extname(pathname) && !isSource && !/^\/(images|fonts|assets)(\/|$)/.test(pathname)) {
      file = resolve(root, "index.html");
    }
    const body = await readFile(file).catch(error => {
      // Some newer forms have no box sprite on the original site.
      if (error.code === "ENOENT" && pathname.startsWith("/images/pokemon/BoxSprites/")) {
        return readFile(file.replace(`${sep}BoxSprites${sep}`, `${sep}BookSprites${sep}`));
      }
      throw error;
    });
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    const status = error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 500;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: status === 404 ? "Not found" : error.message }));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`PokéroleDex local: http://localhost:${port}`);
});
