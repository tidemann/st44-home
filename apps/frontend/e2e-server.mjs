/**
 * Simple E2E test server that:
 * 1. Serves static files from dist/home/browser
 * 2. Proxies /api requests to the backend
 */

import { createServer } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 4202;
const BACKEND_HOST = process.env.BACKEND_HOST || 'host.docker.internal';
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';
const STATIC_DIR = join(__dirname, 'dist/home/browser');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

async function proxyRequest(req, res) {
  const backendUrl = `http://${BACKEND_HOST}:${BACKEND_PORT}${req.url}`;

  try {
    // Read body for methods that have one
    let body;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          const data = Buffer.concat(chunks);
          resolve(data.length > 0 ? data : undefined);
        });
        req.on('error', reject);
      });
    }

    const fetchOptions = {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([key]) =>
          !['host', 'connection', 'content-length'].includes(key.toLowerCase())
        )
      ),
    };

    if (body) {
      fetchOptions.body = body;
      fetchOptions.headers['content-length'] = body.length.toString();
    }

    const response = await fetch(backendUrl, fetchOptions);

    res.writeHead(response.status, {
      ...Object.fromEntries(response.headers.entries()),
      'Access-Control-Allow-Origin': '*',
    });

    const text = await response.text();
    res.end(text);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  }
}

function serveStatic(req, res) {
  let filePath = join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);

  // Remove query string
  filePath = filePath.split('?')[0];

  // Check if file exists
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    // SPA fallback - serve index.html for all routes
    filePath = join(STATIC_DIR, 'index.html');
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // Proxy API requests
  if (req.url.startsWith('/api')) {
    proxyRequest(req, res);
    return;
  }

  // Serve static files
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`E2E Server running at http://0.0.0.0:${PORT}`);
  console.log(`Proxying /api to http://${BACKEND_HOST}:${BACKEND_PORT}`);
  console.log(`Serving static files from ${STATIC_DIR}`);
});
