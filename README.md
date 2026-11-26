# Waste Wallet Backend (Express + JWT + PostgreSQL + Midtrans Iris)

## Menjalankan
```bash
npm install
cp .env.example .env      # isi JWT_SECRET & DATABASE_URL
npm run migrate           # membuat tabel
npm run dev
```

## Alur API
| # | Endpoint | Auth | Fungsi |
|---|----------|------|--------|
| 1 | `POST /api/auth/validate` | - | Validasi `no_telp` + `jenis_wallet` → JWT |
| 2 | `POST /api/scan` (form-data `image`) | Bearer | AI placeholder → `scan_id`, `organic_value`, `non_organic_value` |
| 3 | `POST /api/withdrawals` | Bearer | Penarikan via Midtrans Iris → data hasil untuk FE |
| 4 | `GET /api/withdrawals/:id` | Bearer | Cek status transaksi |
| 5 | `POST /api/webhooks/iris` | - | Notifikasi status payout dari Midtrans |

### Contoh
```bash
curl -X POST localhost:3000/api/auth/validate -H 'Content-Type: application/json' \
  -d '{"no_telp":"081234567890","jenis_wallet":"gopay"}'

curl -X POST localhost:3000/api/scan -H "Authorization: Bearer $TOKEN" -F image=@sampah.jpg

curl -X POST localhost:3000/api/withdrawals -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"scan_id":"<uuid>","organic_value":120,"non_organic_value":340,"jenis_pembayaran":"gopay","no_telp":"081234567890"}'
```
Response withdrawal:
```json
{ "success": true, "data": { "transaction_id": "...", "status": "success",
  "jenis_sampah": "campuran", "nama_sampah": ["botol plastik","kulit buah"],
  "confidence": 0.8731, "transfered_amount": 460, "referral_number": "..." } }
```
