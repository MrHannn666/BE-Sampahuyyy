const multer = require('multer');
const { AppError } = require('../utils/errors');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    cb(new AppError(400, 'Format gambar harus JPEG, PNG, atau WebP', 'INVALID_IMAGE'));
  },
}).single('image');
