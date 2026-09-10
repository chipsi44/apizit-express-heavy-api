const express = require('express');
const { setTimeout: sleep } = require('node:timers/promises');
const contract = require('./contract.cjs');
const multer = require('multer');
const { createHeavy, MAX_UPLOAD } = require('./heavy.cjs');
function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/info', (_req, res) => res.json({ framework: 'express', profile: 'heavy' }));
  app.post('/echo', (req, res) => res.json(contract.echo(req.body)));
  app.get('/items/:item_id', (req, res) =>
    res.json(contract.item(req.params.item_id, req.query.include_details)),
  );
  app.get('/slow', async (_req, res) => {
    await (options.sleep || sleep)(80000);
    res.json({ delay_seconds: 80, status: 'completed' });
  });
  const heavy = createHeavy(options.registry);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD, files: 1, fields: 0, parts: 2 },
  }).single('file');
  app.get('/ready', async (_req, res) => {
    const result = await heavy.ready();
    res.status(result.statusCode).json(result.body);
  });
  app.post('/text/embedding', async (req, res) => res.json(await heavy.textEmbedding(req.body)));
  app.post('/text/similarity', async (req, res) => res.json(await heavy.similarity(req.body)));
  app.post('/image/analyze', upload, async (req, res) =>
    res.json(await heavy.imageAnalyze(req.file)),
  );
  app.post('/image/embedding', upload, async (req, res) =>
    res.json(await heavy.imageEmbedding(req.file)),
  );
  app.use((error, _req, res, _next) => {
    const status =
      error.code === 'LIMIT_FILE_SIZE'
        ? 413
        : error.code?.startsWith('LIMIT_')
          ? 400
          : error.status || 500;
    res.status(status).json({
      error: status >= 500 && status !== 503 ? 'An unexpected error occurred.' : error.message,
    });
  });
  return app;
}
module.exports = { createApp };
