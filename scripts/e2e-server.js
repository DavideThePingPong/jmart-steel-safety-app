#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

function resolvePath(requestPath) {
  const sanitized = decodeURIComponent(requestPath).replace(/^\/+/, '');
  const candidate = path.normalize(path.join(ROOT, sanitized));
  if (!candidate.startsWith(ROOT)) {
    return null;
  }

  if (requestPath === '/' || requestPath === '') {
    return path.join(ROOT, 'index.html');
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const directoryIndex = path.join(candidate, 'index.html');
    if (fs.existsSync(directoryIndex)) {
      return directoryIndex;
    }
  }

  return candidate;
}

function send(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const filePath = resolvePath(requestUrl.pathname);

  if (!filePath) {
    send(response, 403, 'Forbidden', MIME_TYPES['.txt']);
    return;
  }

  fs.readFile(filePath, (error, body) => {
    if (error) {
      send(response, 404, 'Not Found', MIME_TYPES['.txt']);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    send(response, 200, body, contentType);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`E2E server listening at http://127.0.0.1:${PORT}`);
});
