require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migrasi selesai');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
