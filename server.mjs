import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './lib/store.mjs';
import { validateLead } from './lib/validation.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'quoteloop.sqlite');
const PORT = Number(process.env.PORT || 18081);
const HOST = process.env.HOST || '127.0.0.1';
const VERSION = '0.1.0';
const store = new Store(DB_PATH);
const rate = new Map();
const MAX_BODY = 12_000;
const ALLOWED_EVENTS = new Set(['page_view', 'calculator_run', 'app_open', 'app_export', 'guide_download', 'lead_form_view']);

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...securityHeaders()
  });
  res.end(body);
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'"
  };
}

function clientIp(req) {
  return req.socket.remoteAddress || 'unknown';
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY) { reject(new Error('body too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

async function sendStatic(res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname === '/app' ? '/app.html' : pathname === '/playbook' ? '/playbook.html' : pathname;
  const file = path.resolve(PUBLIC, `.${requested}`);
  if (!file.startsWith(`${PUBLIC}${path.sep}`)) return json(res, 400, { error: 'invalid path' });
  try {
    const info = await stat(file);
    if (!info.isFile()) return json(res, 404, { error: 'not found' });
    const body = await readFile(file);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': pathname === '/' || pathname === '/app' ? 'no-store' : 'public, max-age=3600', ...securityHeaders() });
    res.end(body);
  } catch { json(res, 404, { error: 'not found' }); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    if (req.method === 'GET' && pathname === '/health') return json(res, 200, { ok: true, product: 'QuoteLoop', version: VERSION, dryRun: true, liveOutreach: false, paymentsEnabled: false });
    if (req.method === 'GET' && pathname === '/api/metrics') return json(res, 200, { ok: true, ...store.metrics() });
    if (req.method === 'POST' && pathname === '/api/events') {
      const body = await readJson(req);
      const kind = String(body.kind || '');
      if (!ALLOWED_EVENTS.has(kind)) return json(res, 400, { error: 'unsupported event' });
      store.logEvent(kind, String(body.path || '/'), { referrer: String(body.referrer || '').slice(0, 200) });
      return json(res, 201, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/leads') {
      const ip = clientIp(req);
      const now = Date.now();
      if (now - (rate.get(ip) || 0) < 30_000) return json(res, 429, { error: 'Please wait a moment and try again.' });
      rate.set(ip, now);
      const result = validateLead(await readJson(req));
      if (!result.ok) return json(res, result.error === 'spam' ? 202 : 400, result.error === 'spam' ? { ok: true } : { error: result.error });
      const lead = store.addLead(result.value, String((await Promise.resolve(new URL(req.url, 'http://localhost'))).searchParams.get('source') || 'landing').slice(0, 40));
      store.logEvent('lead_created', pathname, { trade: result.value.trade });
      return json(res, 201, { ok: true, id: lead.id, message: 'Thanks — your pilot request is recorded.' });
    }
    if (req.method === 'GET' && pathname === '/admin/leads') {
      const expected = process.env.ADMIN_TOKEN;
      if (!expected) return json(res, 503, { error: 'Admin token is not configured.' });
      if (url.searchParams.get('token') !== expected) return json(res, 401, { error: 'Unauthorized' });
      return json(res, 200, { ok: true, leads: store.listLeads() });
    }
    if (req.method === 'GET') return sendStatic(res, pathname);
    return json(res, 405, { error: 'method not allowed' });
  } catch (error) {
    if (!res.headersSent) json(res, 400, { error: error.message || 'request failed' });
  }
});

server.listen(PORT, HOST, () => console.log(`QuoteLoop ${VERSION} listening on http://${HOST}:${PORT}`));

function shutdown() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
