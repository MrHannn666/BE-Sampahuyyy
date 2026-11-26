const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const pool = require('../config/db');
const config = require('../config');
const { normalizePhone } = require('../utils/phone');

const schema = z.object({
  no_telp: z.string().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Nomor telepon tidak valid (contoh: 081234567890)' });
    return n;
  }),
  jenis_wallet: z.string().transform((v) => v.toLowerCase()).refine(
    (v) => Object.keys(config.wallets).includes(v),
    { message: `jenis_wallet harus salah satu dari: ${Object.keys(config.wallets).join(', ')}` },
  ),
});

// POST /api/auth/validate
router.post('/validate', async (req, res, next) => {
  try {
    const { no_telp, jenis_wallet } = schema.parse(req.body);

    const { rows } = await pool.query(
      `INSERT INTO users (no_telp, jenis_wallet) VALUES ($1, $2)
       ON CONFLICT (no_telp) DO UPDATE SET jenis_wallet = EXCLUDED.jenis_wallet, last_login_at = now()
       RETURNING id`,
      [no_telp, jenis_wallet],
    );

    const token = jwt.sign(
      { no_telp, jenis_wallet },
      config.jwt.secret,
      { algorithm: 'HS256', subject: rows[0].id, expiresIn: config.jwt.expiresIn },
    );

    res.json({ success: true, data: { token, token_type: 'Bearer', expires_in: config.jwt.expiresIn, no_telp, jenis_wallet } });
  } catch (e) { next(e); }
});

module.exports = router;
