// Draws the Diddit app icons with pngjs: brand gradient, white check mark.
// Run from the repo root: node apps/frontend/scripts/generate-icons.mjs apps/frontend/public/icons
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const A = [0x63, 0x66, 0xf1]; // --color-primary
const B = [0xec, 0x48, 0x99]; // --color-secondary

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function draw(size, { rounded, checkScale }) {
  const png = new PNG({ width: size, height: size });
  const r = rounded ? size * 0.22 : 0;
  const s = (size / 100) * checkScale;
  const off = (size - 100 * s) / 2;
  const pts = [
    [30, 52],
    [44, 66],
    [71, 36],
  ].map(([x, y]) => [off + x * s, off + y * s]);
  const halfStroke = 5 * s;
  const cx = off + 50 * s,
    cy = off + 50 * s,
    cr = 34 * s;
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0,
        check = 0,
        ring = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS,
            py = y + (sy + 0.5) / SS;
          // Rounded-rect coverage
          const qx = Math.max(r - px, px - (size - r), 0);
          const qy = Math.max(r - py, py - (size - r), 0);
          if (r === 0 || Math.hypot(qx, qy) <= r) cov++;
          const d = Math.min(
            segDist(px, py, ...pts[0], ...pts[1]),
            segDist(px, py, ...pts[1], ...pts[2]),
          );
          if (d <= halfStroke) check++;
          if (Math.hypot(px - cx, py - cy) <= cr) ring++;
        }
      const n = SS * SS;
      const t = (x + y) / (2 * size);
      let col = A.map((a, i) => a + (B[i] - a) * t);
      // Soft white disc behind the check (18%), then the white check
      col = col.map((c) => c + (255 - c) * 0.18 * (ring / n));
      col = col.map((c) => c + (255 - c) * (check / n));
      const i = (y * size + x) * 4;
      png.data[i] = Math.round(col[0]);
      png.data[i + 1] = Math.round(col[1]);
      png.data[i + 2] = Math.round(col[2]);
      png.data[i + 3] = Math.round(255 * (cov / n));
    }
  }
  return PNG.sync.write(png);
}

const icons = [
  ['icon-192.png', 192, { rounded: true, checkScale: 1 }],
  ['icon-512.png', 512, { rounded: true, checkScale: 1 }],
  // Maskable: full bleed, check inside the 80% safe zone
  ['icon-maskable-512.png', 512, { rounded: false, checkScale: 0.8 }],
  // iOS rounds the corners itself
  ['apple-touch-icon.png', 180, { rounded: false, checkScale: 0.9 }],
];
for (const [name, size, opts] of icons) writeFileSync(`${out}/${name}`, draw(size, opts));
