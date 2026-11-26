const router = require('express').Router();
const pool = require('../config/db');
const midtrans = require('../services/midtransService');

// POST /api/webhooks/iris (daftarkan sebagai Payout Notification URL di dashboard Iris)
// Payload tidak dipercaya begitu saja: status diverifikasi ulang langsung ke API Iris.
router.post('/iris', async (req, res) => {
  const ref = req.body && req.body.reference_no;
  try {
    await pool.query('INSERT INTO webhook_events (reference_no, payload) VALUES ($1,$2)', [ref || null, JSON.stringify(req.body || {})]);
    if (ref) {
      const details = await midtrans.getPayoutDetails(ref);
      await pool.query(
        `UPDATE transactions SET status=$2, gateway_response=$3, updated_at=now()
         WHERE referral_number=$1 AND status <> 'success'`,
        [ref, midtrans.mapStatus(details.status), JSON.stringify(details)],
      );
    }
  } catch (e) {
    console.error('Webhook error:', e.message);
  }
  res.sendStatus(200);
});

module.exports = router;
