import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUESTED_HOST = process.env.HOST ?? "localhost";
const PORT = Number(process.env.PORT ?? "8443");
const CERT_FILE = process.env.HTTPS_CERT ?? path.join(__dirname, "certs", "localhost-cert.pem");
const KEY_FILE = process.env.HTTPS_KEY ?? path.join(__dirname, "certs", "localhost-key.pem");

const CONTENT_TYPE = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

if (!existsSync(CERT_FILE) || !existsSync(KEY_FILE)) {
  console.error("Missing HTTPS certificate files.");
  console.error("Run: npm run cert:generate");
  console.error(`Expected cert: ${CERT_FILE}`);
  console.error(`Expected key: ${KEY_FILE}`);
  process.exit(1);
}

const [cert, key] = await Promise.all([readFile(CERT_FILE), readFile(KEY_FILE)]);

const hostCandidates = REQUESTED_HOST === "localhost"
  ? ["localhost", "127.0.0.1"]
  : [REQUESTED_HOST];

startServer(0);

function startServer(candidateIndex) {
  const bindHost = hostCandidates[candidateIndex];
  const server = createServer({ cert, key }, requestHandler);

  server.on("error", (err) => {
    if (canFallback(err) && candidateIndex + 1 < hostCandidates.length) {
      const nextHost = hostCandidates[candidateIndex + 1];
      console.warn(`Unable to listen on ${bindHost}:${PORT} (${err.code}). Retrying on ${nextHost}:${PORT}...`);
      startServer(candidateIndex + 1);
      return;
    }

    console.error(err);
    process.exit(1);
  });

  server.listen(PORT, bindHost, () => {
    const urlHost = REQUESTED_HOST === "localhost" ? "localhost" : bindHost;
    console.log(`HTTPS server running at https://${urlHost}:${PORT}`);
  });
}

async function requestHandler(req, res) {
  if (!req.url) {
    sendStatus(res, 400, "Bad Request");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendStatus(res, 405, "Method Not Allowed");
    return;
  }

  const filePath = resolvePath(req.url);
  if (!filePath) {
    sendStatus(res, 403, "Forbidden");
    return;
  }

  try {
    let targetPath = filePath;
    const s = await stat(targetPath);
    if (s.isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = CONTENT_TYPE[ext] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(targetPath).pipe(res);
  } catch {
    sendStatus(res, 404, "Not Found");
  }
}

function resolvePath(requestUrl) {
  const noQuery = requestUrl.split("?")[0];
  const decoded = decodeURIComponent(noQuery);
  const normalized = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.normalize(path.join(__dirname, normalized));
  if (!resolved.startsWith(__dirname)) {
    return null;
  }
  return resolved;
}

function sendStatus(res, statusCode, statusText) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(statusText);
}

function canFallback(err) {
  return err?.code === "EADDRNOTAVAIL" || err?.code === "EPERM";
}
