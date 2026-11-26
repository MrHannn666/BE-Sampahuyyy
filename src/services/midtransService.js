/**
 * Midtrans Iris (Disbursement/Payout) - hanya untuk penarikan ke user.
 * Alur: Create Payout (creator key) -> Approve Payout (approver key).
 * Docs: https://docs.midtrans.com/reference/iris-api-overview
 */
const crypto = require('crypto');
const config = require('../config');
const { AppError } = require('../utils/errors');

const BASE = config.midtrans.isProduction
  ? 'https://app.midtrans.com/iris/api/v1'
  : 'https://app.sandbox.midtrans.com/iris/api/v1';

const basic = (key) => 'Basic ' + Buffer.from(`${key}:`).toString('base64');

async function irisFetch(path, { method = 'GET', key, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: basic(key), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error_message || (Array.isArray(data.errors) ? data.errors.join(', ') : '') || `Midtrans error (${res.status})`;
    throw new AppError(502, msg, 'GATEWAY_ERROR');
  }
  return data;
}

// Status Iris -> status internal
function mapStatus(irisStatus) {
  switch (irisStatus) {
    case 'completed': return 'success';
    case 'failed':
    case 'rejected': return 'failed';
    default: return 'processing'; // queued, processed
  }
}

async function createAndApprovePayout({ idempotencyKey, name, account, wallet, amount, notes }) {
  if (config.midtrans.mock) {
    const ref = 'MOCK' + crypto.randomBytes(6).toString('hex').toUpperCase();
    return { referenceNo: ref, irisStatus: 'completed', raw: { mock: true, reference_no: ref, amount } };
  }

  const created = await irisFetch('/payouts', {
    method: 'POST',
    key: config.midtrans.creatorKey,
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: {
      payouts: [{
        beneficiary_name: name,
        beneficiary_account: account,
        beneficiary_bank: config.wallets[wallet],
        beneficiary_email: 'noreply@example.com',
        amount: String(amount),
        notes,
      }],
    },
  });
  const payout = created.payouts && created.payouts[0];
  if (!payout || !payout.reference_no) throw new AppError(502, 'Respons Midtrans tidak valid', 'GATEWAY_ERROR');

  await irisFetch('/payouts/approve', {
    method: 'POST',
    key: config.midtrans.approverKey,
    body: { reference_nos: [payout.reference_no] },
  });

  return { referenceNo: payout.reference_no, irisStatus: payout.status || 'queued', raw: created };
}

async function getPayoutDetails(referenceNo) {
  if (config.midtrans.mock) return { reference_no: referenceNo, status: 'completed' };
  return irisFetch(`/payouts/${encodeURIComponent(referenceNo)}`, { key: config.midtrans.approverKey });
}

module.exports = { createAndApprovePayout, getPayoutDetails, mapStatus };
