import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
const distDir = path.resolve(process.cwd(), "dist");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath)] ?? "application/octet-stream";
}

function isInsideDist(filePath) {
  return filePath === distDir || filePath.startsWith(`${distDir}${path.sep}`);
}

async function resolveAssetPath(requestPath) {
  const trimmedPath = requestPath === "/" ? "/index.html" : requestPath;
  const absolutePath = path.resolve(distDir, `.${trimmedPath}`);

  if (!isInsideDist(absolutePath)) {
    return null;
  }

  try {
    const fileStat = await stat(absolutePath);

    if (fileStat.isFile()) {
      return absolutePath;
    }
  } catch {
    return null;
  }

  return null;
}

async function ensureDistExists() {
  await access(path.join(distDir, "index.html"));
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
  const assetPath = await resolveAssetPath(requestUrl.pathname);
  const fallbackPath = path.join(distDir, "index.html");
  const filePath = assetPath ?? fallbackPath;
  const statusCode = assetPath || !path.extname(requestUrl.pathname) ? 200 : 404;

  response.statusCode = statusCode;
  response.setHeader("Content-Type", getContentType(filePath));
  createReadStream(filePath).pipe(response);
});

await ensureDistExists();

server.listen(port, host, () => {
  process.stdout.write(`Serving dist at http://${host}:${port}\n`);
});
