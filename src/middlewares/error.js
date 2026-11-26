const { ZodError } = require('zod');

// eslint-disable-next-line no-unused-vars
module.exports = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false, code: 'VALIDATION_ERROR', message: 'Input tidak valid',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: err.message });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: status >= 500 && !err.code ? 'Terjadi kesalahan pada server' : err.message,
  });
};
