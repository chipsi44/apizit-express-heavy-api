const { createApp } = require('./app.cjs');
const server = createApp().listen(
  Number(process.env.PORT || 8000),
  process.env.APP_HOST || '127.0.0.1',
);
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => server.close());
