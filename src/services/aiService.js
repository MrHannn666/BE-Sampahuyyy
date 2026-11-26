/**
 * PLACEHOLDER model AI.
 * Ganti isi fungsi analyzeImage() dengan pemanggilan model asli
 * (mis. YOLO via Python service / TensorFlow Serving / ONNX).
 *
 * Kontrak output (jangan diubah agar bagian lain tetap jalan):
 *   [{ name: string, category: 'organic' | 'non_organic', confidence: 0..1, estimated_weight_kg: number }]
 */
const CATALOG = [
  { name: 'sisa sayuran', category: 'organic', w: [0.1, 0.5] },
  { name: 'kulit buah', category: 'organic', w: [0.05, 0.3] },
  { name: 'daun kering', category: 'organic', w: [0.05, 0.2] },
  { name: 'botol plastik', category: 'non_organic', w: [0.02, 0.1] },
  { name: 'kaleng minuman', category: 'non_organic', w: [0.01, 0.05] },
  { name: 'kardus', category: 'non_organic', w: [0.1, 0.6] },
  { name: 'kantong plastik', category: 'non_organic', w: [0.01, 0.05] },
];

const rand = (a, b) => a + Math.random() * (b - a);

async function analyzeImage(_imageBuffer) {
  const count = 1 + Math.floor(Math.random() * 4);
  return Array.from({ length: count }, () => {
    const it = CATALOG[Math.floor(Math.random() * CATALOG.length)];
    return {
      name: it.name,
      category: it.category,
      confidence: Number(rand(0.7, 0.99).toFixed(4)),
      estimated_weight_kg: Number(rand(it.w[0], it.w[1]).toFixed(3)),
    };
  });
}

module.exports = { analyzeImage };
