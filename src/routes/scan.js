const router = require('express').Router();
const crypto = require('crypto');
const pool = require('../config/db');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { AppError } = require('../utils/errors');
const ai = require('../services/aiService');
const pricing = require('../services/pricingService');

// POST /api/scan  (multipart/form-data, field: image)
router.post('/', auth, upload, async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'File gambar (field "image") wajib dikirim', 'NO_IMAGE');

    const detections = await ai.analyzeImage(req.file.buffer);
    const r = pricing.calculate(detections);
    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    const { rows } = await pool.query(
      `INSERT INTO scans (user_id, image_hash, detections, organic_weight_kg, non_organic_weight_kg,
                          organic_value, non_organic_value, avg_confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.user.id, hash, JSON.stringify(detections), r.organicKg, r.nonOrganicKg,
       r.organicValue, r.nonOrganicValue, r.avgConfidence],
    );

    res.status(201).json({
      success: true,
      data: {
        scan_id: rows[0].id,
        organic_value: r.organicValue,
        non_organic_value: r.nonOrganicValue,
      },
    });
  } catch (e) { next(e); }
});

module.exports = router;
