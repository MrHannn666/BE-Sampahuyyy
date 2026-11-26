const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');

module.exports = function auth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Token tidak ditemukan', 'NO_TOKEN'));
  try {
    const p = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    req.user = { id: p.sub, no_telp: p.no_telp, jenis_wallet: p.jenis_wallet };
    next();
  } catch {
    next(new AppError(401, 'Token tidak valid atau kedaluwarsa', 'INVALID_TOKEN'));
  }
};
