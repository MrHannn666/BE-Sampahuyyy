const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const errorHandler = require('./middlewares/error');

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/withdrawals', require('./routes/withdrawal'));
app.use('/api/webhooks', require('./routes/webhook'));

app.use((_req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' }));
app.use(errorHandler);

module.exports = app;
