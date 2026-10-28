'use strict';
const path = require('path');
const express = require('express');
const manager = require('./src/botManager');
const auth = require('./src/auth');

// Ek bot ki galti poore panel ko crash na kare
process.on('uncaughtException', (e) => console.error('[uncaughtException]', (e && e.stack) || e));
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway proxy ke peeche (secure cookie + real IP)

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  next();
});

app.get('/healthz', (req, res) => res.type('text').send('ok'));

app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, file) => {
      if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);
app.use(express.json({ limit: '64kb' }));

app.post('/api/login', auth.login);
app.post('/api/logout', auth.logout);
app.use('/api', auth.requireAuth);

/** sync handler wrapper: return value -> JSON, throw -> error JSON */
const h = (fn) => (req, res) => {
  try {
    const out = fn(req, res);
    res.json(out === undefined ? { ok: true } : out);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Server error' });
  }
};

app.get('/api/bots', h(() => ({ max: manager.MAX_BOTS, bots: manager.list() })));
app.post('/api/bots', h((req) => manager.create(req.body)));
app.get('/api/bots/:id', h((req) => manager.details(req.params.id)));
app.put('/api/bots/:id', h((req) => manager.update(req.params.id, req.body)));
app.delete('/api/bots/:id', h((req) => manager.remove(req.params.id)));
app.post('/api/bots/:id/start', h((req) => manager.start(req.params.id)));
app.post('/api/bots/:id/stop', h((req) => manager.stop(req.params.id)));
app.post('/api/bots/:id/restart', h((req) => manager.restart(req.params.id)));
app.post('/api/bots/:id/say', h((req) => manager.say(req.params.id, req.body && req.body.text)));
app.get('/api/bots/:id/logs', h((req) => ({ lines: manager.logs(req.params.id) })));
app.post('/api/bots/:id/logs/clear', h((req) => manager.clearLogs(req.params.id)));

/* ---- live updates (status + console) : Server-Sent Events ---- */
app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const onStatus = (s) => send('status', s);
  const onLog = (e) => send('log', e);
  const onClear = (e) => send('logclear', e);
  const onList = () => send('list', {});
  manager.on('status', onStatus);
  manager.on('log', onLog);
  manager.on('logclear', onClear);
  manager.on('list', onList);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => {
    clearInterval(ping);
    manager.off('status', onStatus);
    manager.off('log', onLog);
    manager.off('logclear', onClear);
    manager.off('list', onList);
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || 400).json({ error: err.type === 'entity.parse.failed' ? 'Invalid JSON' : err.message });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
manager.init();
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[panel] running on port ${PORT}`);
  if (auth.GENERATED) {
    console.log('[panel] PANEL_PASSWORD env set nahi hai. Auto-generated password:', auth.PASSWORD);
    console.log('[panel] Railway > Variables me PANEL_PASSWORD set kar do.');
  }
});

function shutdown(sig) {
  console.log(`[panel] ${sig} - shutting down`);
  manager.shutdownAll();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
