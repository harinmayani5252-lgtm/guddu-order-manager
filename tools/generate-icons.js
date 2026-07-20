/*
 * Zero-dependency PNG icon generator for the Guddu Order Manager PWA.
 * Draws a full-bleed brand background with an interlocking "GG" ring mark.
 * Outputs maskable-safe PNG icons used by manifest.webmanifest and iOS.
 *
 * Run: node tools/generate-icons.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---- tiny PNG encoder (RGBA, 8-bit) ------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  // rest zero (compression, filter, interlace)
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing ------------------------------------------------------------
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const bgTop = [0x63, 0x66, 0xf1];    // indigo-500
  const bgBottom = [0x43, 0x38, 0xca]; // indigo-700
  const ink = [0xff, 0xff, 0xff];

  const cy = size * 0.5;
  const r = size * 0.19;
  const thick = size * 0.07;
  const cxL = size * 0.40, cxR = size * 0.60;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // vertical gradient background (full bleed for maskable)
      let col = mix(bgTop, bgBottom, y / size);
      let alpha = 255;

      // two interlocking rings
      const dL = Math.abs(Math.hypot(x - cxL, y - cy) - r);
      const dR = Math.abs(Math.hypot(x - cxR, y - cy) - r);
      const onRing = Math.min(dL, dR) < thick / 2;
      // create the "interlock" by letting the right ring pass over on top-left / bottom-right
      if (onRing) {
        // simple anti-alias on ring edge
        const edge = Math.min(dL, dR);
        const aa = Math.max(0, Math.min(1, (thick / 2 - edge) / 1.5));
        col = mix(col, ink, aa);
      }

      const i = (y * size + x) * 4;
      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = alpha;
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-64.png', 64],
];
for (const [name, size] of targets) {
  fs.writeFileSync(path.join(outDir, name), drawIcon(size));
  console.log('wrote', name, size + 'x' + size);
}
console.log('done');
