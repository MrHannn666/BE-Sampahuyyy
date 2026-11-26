require('dotenv').config();

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');

const config = {
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  price: {
    organicPerKg: Number(process.env.PRICE_ORGANIC_PER_KG) || 500,
    nonOrganicPerKg: Number(process.env.PRICE_NON_ORGANIC_PER_KG) || 2000,
    minWithdrawal: Number(process.env.MIN_WITHDRAWAL) || 1000,
  },
  midtrans: {
    mock: bool(process.env.MIDTRANS_MOCK, true),
    isProduction: bool(process.env.MIDTRANS_IS_PRODUCTION, false),
    creatorKey: process.env.MIDTRANS_IRIS_CREATOR_KEY || '',
    approverKey: process.env.MIDTRANS_IRIS_APPROVER_KEY || '',
  },
  // Wallet yang didukung -> kode "bank" di Midtrans Iris.
  // PENTING: cek daftar bank/e-wallet terbaru di dashboard/dokumentasi Iris, lalu sesuaikan kode ini.
  wallets: {
    gopay: 'gopay',
    ovo: 'ovo',
    dana: 'dana',
    shopeepay: 'shopeepay',
    linkaja: 'linkaja',
  },
};

if (!config.jwt.secret || config.jwt.secret.length < 8) {
  throw new Error('JWT_SECRET wajib diisi (minimal 32 karakter)');
}
if (!config.midtrans.mock && (!config.midtrans.creatorKey || !config.midtrans.approverKey)) {
  throw new Error('MIDTRANS_IRIS_CREATOR_KEY & MIDTRANS_IRIS_APPROVER_KEY wajib jika MIDTRANS_MOCK=false');
}

module.exports = config;
