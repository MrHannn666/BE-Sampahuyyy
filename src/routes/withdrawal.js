const router = require('express').Router();
const { z } = require('zod');
const pool = require('../config/db');
const config = require('../config');
const auth = require('../middlewares/auth');
const { AppError } = require('../utils/errors');
const { normalizePhone } = require('../utils/phone');
const midtrans = require('../services/midtransService');
const pricing = require('../services/pricingService');

const schema = z.object({
  scan_id: z.string().uuid(),
  organic_value: z.number().int().min(0),
  non_organic_value: z.number().int().min(0),
  jenis_pembayaran: z.string().transform((v) => v.toLowerCase())
    .refine((v) => Object.keys(config.wallets).includes(v), { message: 'jenis_pembayaran tidak didukung' }),
  no_telp: z.string().transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Nomor telepon tidak valid' });
    return n;
  }),
});

// Susun response untuk frontend dari data scan + transaksi
function buildResponse(tx, scan) {
  const detections = scan.detections;
  return {
    transaction_id: tx.id,
    status: tx.status,
    jenis_sampah: pricing.jenisSampah(detections),
    nama_sampah: [...new Set(detections.map((d) => d.name))],
    confidence: Number(scan.avg_confidence),
    transfered_amount: tx.amount,
    referral_number: tx.referral_number,
  };
}

// POST /api/withdrawals
router.post('/', auth, async (req, res, next) => {
  const client = await pool.connect();
  let tx;
  let scan;
  try {
    const body = schema.parse(req.body);

    // Data harus cocok dengan identitas di token
    if (body.no_telp !== req.user.no_telp) throw new AppError(403, 'no_telp tidak sesuai dengan token', 'PHONE_MISMATCH');
    if (body.jenis_pembayaran !== req.user.jenis_wallet) throw new AppError(403, 'jenis_pembayaran tidak sesuai dengan token', 'WALLET_MISMATCH');

    // 1) Reservasi scan + buat transaksi pending (atomik)
    await client.query('BEGIN');
    const s = await client.query('SELECT * FROM scans WHERE id=$1 AND user_id=$2 FOR UPDATE', [body.scan_id, req.user.id]);
    scan = s.rows[0];
    if (!scan) throw new AppError(404, 'Scan tidak ditemukan', 'SCAN_NOT_FOUND');
    if (scan.status === 'used') throw new AppError(409, 'Scan ini sudah pernah ditarik', 'SCAN_USED');
    if (scan.organic_value !== body.organic_value || scan.non_organic_value !== body.non_organic_value) {
      throw new AppError(400, 'Nilai tidak sesuai dengan hasil scan', 'VALUE_MISMATCH');
    }
    const amount = scan.organic_value + scan.non_organic_value;
    if (amount < config.price.minWithdrawal) {
      throw new AppError(400, `Minimal penarikan Rp${config.price.minWithdrawal}`, 'BELOW_MINIMUM');
    }
    const t = await client.query(
      `INSERT INTO transactions (user_id, scan_id, no_telp, jenis_pembayaran, organic_value, non_organic_value, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, scan.id, body.no_telp, body.jenis_pembayaran, body.organic_value, body.non_organic_value, amount],
    );
    tx = t.rows[0];
    await client.query("UPDATE scans SET status='used' WHERE id=$1", [scan.id]);
    await client.query('COMMIT');

    // 2) Panggil payment gateway (di luar transaksi DB)
    try {
      const out = await midtrans.createAndApprovePayout({
        idempotencyKey: tx.id,
        name: `Pengguna ${body.no_telp.slice(-4)}`,
        account: body.no_telp,
        wallet: body.jenis_pembayaran,
        amount,
        notes: `Penarikan hasil pilah sampah ${tx.id}`,
      });
      const upd = await pool.query(
        `UPDATE transactions SET status=$2, referral_number=$3, gateway_response=$4, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [tx.id, midtrans.mapStatus(out.irisStatus), out.referenceNo, JSON.stringify(out.raw)],
      );
      tx = upd.rows[0];
    } catch (gwErr) {
      // Gagal: tandai failed & buka kembali scan agar bisa dicoba ulang
      await pool.query("UPDATE transactions SET status='failed', error_message=$2, updated_at=now() WHERE id=$1", [tx.id, gwErr.message]);
      await pool.query("UPDATE scans SET status='open' WHERE id=$1", [scan.id]);
      throw gwErr;
    }

    res.status(201).json({ success: true, data: buildResponse(tx, scan) });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* sudah commit */ }
    if (e.code === '23505') return next(new AppError(409, 'Transaksi untuk scan ini sudah ada', 'DUPLICATE'));
    next(e);
  } finally {
    client.release();
  }
});

// GET /api/withdrawals/:id -> cek status transaksi milik sendiri
router.get('/:id', auth, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const { rows } = await pool.query(
      `SELECT t.*, s.detections, s.avg_confidence FROM transactions t
       JOIN scans s ON s.id = t.scan_id WHERE t.id=$1 AND t.user_id=$2`,
      [id, req.user.id],
    );
    if (!rows[0]) throw new AppError(404, 'Transaksi tidak ditemukan', 'NOT_FOUND');
    res.json({ success: true, data: buildResponse(rows[0], rows[0]) });
  } catch (e) { next(e); }
});

module.exports = router;
