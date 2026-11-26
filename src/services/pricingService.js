const config = require('../config');

function calculate(detections) {
  let organicKg = 0;
  let nonOrganicKg = 0;
  for (const d of detections) {
    if (d.category === 'organic') organicKg += d.estimated_weight_kg;
    else nonOrganicKg += d.estimated_weight_kg;
  }
  const avgConfidence = detections.length
    ? detections.reduce((s, d) => s + d.confidence, 0) / detections.length
    : 0;

  return {
    organicKg: Number(organicKg.toFixed(3)),
    nonOrganicKg: Number(nonOrganicKg.toFixed(3)),
    organicValue: Math.round(organicKg * config.price.organicPerKg),
    nonOrganicValue: Math.round(nonOrganicKg * config.price.nonOrganicPerKg),
    avgConfidence: Number(avgConfidence.toFixed(4)),
  };
}

function jenisSampah(detections) {
  const hasO = detections.some((d) => d.category === 'organic');
  const hasN = detections.some((d) => d.category === 'non_organic');
  if (hasO && hasN) return 'campuran';
  return hasO ? 'organik' : hasN ? 'non_organik' : 'tidak_terdeteksi';
}

module.exports = { calculate, jenisSampah };
