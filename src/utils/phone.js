// Normalisasi ke format lokal 08xxxxxxxxxx. Return null jika tidak valid.
function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  let p = input.replace(/[\s\-().]/g, '');
  if (p.startsWith('+62')) p = '0' + p.slice(3);
  else if (p.startsWith('62')) p = '0' + p.slice(2);
  return /^08[1-9][0-9]{7,10}$/.test(p) ? p : null;
}
module.exports = { normalizePhone };
