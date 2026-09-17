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

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4); // image count

  let offset = 6 + count * 16;
  const entries = [];
  const datas = [];

  for (const { width, height, buffer } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset

    entries.push(entry);
    datas.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...datas]);
}

// Render Daily Roll Icon (Dark squircle container with neon cyan/emerald die, 5 pips & pushpin)
function renderDailyRollIcon(x, y, w, h) {
  const nx = (x / w) * 2 - 1; // -1 to 1
  const ny = (y / h) * 2 - 1;
  const dist = Math.hypot(nx, ny);

  // Background: Deep dark emerald radial container
  let r = Math.round(9 + 8 * (1 - Math.min(1, dist)));
  let g = Math.round(20 + 15 * (1 - Math.min(1, dist)));
  let b = Math.round(15 + 10 * (1 - Math.min(1, dist)));
  let a = 255;

  // Outer squircle border glow
  const cornerDist = Math.max(Math.abs(nx), Math.abs(ny));
  if (cornerDist > 0.88 && cornerDist < 0.96) {
    const glow = Math.sin(((cornerDist - 0.88) / 0.08) * Math.PI);
    r = Math.min(255, r + Math.round(glow * 22));
    g = Math.min(255, g + Math.round(glow * 190));
    b = Math.min(255, b + Math.round(glow * 135));
  }

  // Tilted Central Die (~ -6 deg)
  const angle = -0.10;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const rx = nx * cosA - ny * sinA;
  const ry = nx * sinA + ny * cosA;

  const dieSize = 0.58;
  const dieCorner = 0.14;

  const dx = Math.abs(rx) - dieSize + dieCorner;
  const dy = Math.abs(ry) - dieSize + dieCorner;
  const dieDist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - dieCorner;

  if (dieDist <= 0) {
    // Inside the die face: Vibrant cyan-mint emerald gradient
    const t = (rx + ry + dieSize) / (dieSize * 2);
    r = Math.round(40 + t * 30);
    g = Math.round(220 - t * 95);
    b = Math.round(190 - t * 85);

    // Neon edge highlight
    if (dieDist > -0.05) {
      r = Math.min(255, r + 80);
      g = Math.min(255, g + 35);
      b = Math.min(255, b + 45);
    }

    // 5 Pips
    const pipOffset = dieSize * 0.52;
    const pipRadius = dieSize * 0.14;
    const pips = [
      [0, 0],
      [-pipOffset, -pipOffset],
      [pipOffset, -pipOffset],
      [-pipOffset, pipOffset],
      [pipOffset, pipOffset],
    ];

    for (const [px, py] of pips) {
      const pDist = Math.hypot(rx - px, ry - py);
      if (pDist <= pipRadius) {
        const shadow = pDist / pipRadius;
        r = Math.round(8 + shadow * 8);
        g = Math.round(18 + shadow * 12);
        b = Math.round(13 + shadow * 10);
      }
    }

    // Bottom-right dark corner overlay
    if (rx + ry > dieSize * 0.55) {
      r = Math.round(8);
      g = Math.round(35);
      b = Math.round(22);
    }

    // Pushpin at bottom right corner (rx ~ 0.35, ry ~ 0.30)
    const pinDist = Math.hypot(rx - 0.35, ry - 0.30);
    if (pinDist < 0.16) {
      const pT = pinDist / 0.16;
      r = Math.round(30 + (1 - pT) * 70);
      g = Math.round(180 + (1 - pT) * 75);
      b = Math.round(100 + (1 - pT) * 60);
    }
  } else if (dieDist < 0.1) {
    // Outer cyan-emerald ambient glow
    const glow = 1 - dieDist / 0.1;
    r = Math.min(255, r + Math.round(glow * 35));
    g = Math.min(255, g + Math.round(glow * 190));
    b = Math.min(255, b + Math.round(glow * 140));
  }

  return [r, g, b, a];
}

const publicDir = path.resolve("public");
const appDir = path.resolve("app");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate PNG icons
const png512 = createPng(512, 512, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "icon-512.png"), png512);
console.log("Generated public/icon-512.png (512x512)");

const png192 = createPng(192, 192, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "icon-192.png"), png192);
console.log("Generated public/icon-192.png (192x192)");

const appleIcon = createPng(180, 180, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleIcon);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon-precomposed.png"), appleIcon);
console.log("Generated public/apple-touch-icon.png (180x180)");

const png32 = createPng(32, 32, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), png32);
const png16 = createPng(16, 16, renderDailyRollIcon);
fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), png16);

// 2. Generate ICO file containing 16x16, 32x32, 48x48
const png48 = createPng(48, 48, renderDailyRollIcon);
const icoBuffer = createIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 },
]);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuffer);
console.log("Replaced app/favicon.ico and public/favicon.ico with Daily Roll icon");

// 3. Generate static public/manifest.json for browsers that check root directly
const manifestJson = {
  name: "Daily Roll | Bonus Tracker",
  short_name: "Daily Roll",
  description: "Keep your daily sweepstakes casino bonuses in one place.",
  start_url: "/tracker",
  display: "standalone",
  orientation: "portrait",
  background_color: "#101815",
  theme_color: "#101815",
  icons: [
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
    {
      src: "/favicon.ico",
      sizes: "48x48 32x32 16x16",
      type: "image/x-icon",
    },
  ],
};

fs.writeFileSync(path.join(publicDir, "manifest.json"), JSON.stringify(manifestJson, null, 2));
console.log("Generated public/manifest.json");
