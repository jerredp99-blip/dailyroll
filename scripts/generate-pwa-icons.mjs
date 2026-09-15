import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const toCrc = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(toCrc), 8 + len);
  return chunk;
}

function createPng(width, height, renderPixel) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // filter 0: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, makeChunk("IHDR", ihdr), idat, iend]);
}

// Render Daily Roll Icon (Emerald dark background with dice & coin golden/emerald motifs)
function renderDailyRollIcon(x, y, w, h) {
  const nx = (x / w) * 2 - 1; // -1 to 1
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background: Deep dark emerald radial gradient
  let r = Math.round(7 + 10 * (1 - dist));
  let g = Math.round(20 + 25 * (1 - dist));
  let b = Math.round(14 + 15 * (1 - dist));
  let a = 255;

  // Outer rounded border glow
  const cornerDist = Math.max(Math.abs(nx), Math.abs(ny));
  if (cornerDist > 0.88 && cornerDist < 0.96) {
    const glow = Math.sin((cornerDist - 0.88) / 0.08 * Math.PI);
    r = Math.min(255, r + Math.round(glow * 16));
    g = Math.min(255, g + Math.round(glow * 185));
    b = Math.min(255, b + Math.round(glow * 129));
  }

  // Central Die (Rounded 3D Die in emerald/teal)
  // Center is rotated slightly for a dynamic rolling look
  const angle = -0.15;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rx = nx * cosA - ny * sinA;
  const ry = nx * sinA + ny * cosA;

  const dieSize = 0.52;
  const dieCorner = 0.12;

  // Box SDF
  const dx = Math.abs(rx) - dieSize + dieCorner;
  const dy = Math.abs(ry) - dieSize + dieCorner;
  const dieDist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - dieCorner;

  if (dieDist <= 0) {
    // Inside the die face: Emerald 3D gradient with high contrast
    const t = (rx + ry + dieSize) / (dieSize * 2);
    r = Math.round(16 + t * 36);
    g = Math.round(185 + t * 65); // Vibrant emerald-teal
    b = Math.round(129 + t * 80);

    // Die border highlight
    if (dieDist > -0.04) {
      r = Math.min(255, r + 40);
      g = Math.min(255, g + 40);
      b = Math.min(255, b + 50);
    }

    // Pips on the die face (5-pip pattern: center + 4 corners)
    const pipOffset = dieSize * 0.55;
    const pipRadius = dieSize * 0.14;
    const pips = [
      [0, 0], // Center pip
      [-pipOffset, -pipOffset],
      [pipOffset, -pipOffset],
      [-pipOffset, pipOffset],
      [pipOffset, pipOffset],
    ];

    for (const [px, py] of pips) {
      const pDist = Math.hypot(rx - px, ry - py);
      if (pDist <= pipRadius) {
        // Crisp dark emerald-zinc recessed pip
        const shadow = pDist / pipRadius;
        r = Math.round(8 + shadow * 10);
        g = Math.round(24 + shadow * 20);
        b = Math.round(16 + shadow * 15);
      }
    }
  } else if (dieDist < 0.08) {
    // Die drop shadow / ambient glow
    const shadowIntensity = (1 - dieDist / 0.08);
    r = Math.min(255, r + Math.round(shadowIntensity * 10));
    g = Math.min(255, g + Math.round(shadowIntensity * 90));
    b = Math.min(255, b + Math.round(shadowIntensity * 60));
  }

  return [r, g, b, a];
}

const publicDir = path.resolve("public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const png192 = createPng(192, 192, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
console.log("Generated public/icon-192.png (192x192)");

// Generate 512x512
const png512 = createPng(512, 512, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);
console.log("Generated public/icon-512.png (512x512)");

// Generate 180x180 (Apple Touch Icon)
const appleIcon = createPng(180, 180, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleIcon);
console.log("Generated public/apple-touch-icon.png (180x180)");
