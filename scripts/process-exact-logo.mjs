import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function processLogo() {
  const srcPath = path.resolve('public/logo.jpg');
  if (!fs.existsSync(srcPath)) {
    console.error('public/logo.jpg does not exist');
    process.exit(1);
  }

  const image = sharp(srcPath);
  const metadata = await image.metadata();
  console.log('Original image dimensions:', metadata.width, metadata.height);

  // The original image is 875 x 1024.
  // The central squircle icon is vertically centered around y = 475 to y = 512.
  // Let's crop a square centered around the squircle icon (e.g. 700x700 centered).
  // Let's check bounding box by extracting raw pixels.
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Scan for non-background pixels (the dark green squircle icon and inner cyan die)
  // Background gray level is around RGB (40-60, 40-60, 40-60).
  // Green squircle border / interior has g > 15 & g > r + 5 or dark green #09140f or glowing cyan #7efada (g > 150).
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Exclude bottom right corner sparkle (x > 750, y > 820)
      if (x > 750 && y > 820) continue;

      // Squircle green container boundary or cyan die
      const isSquircle = (g > r + 8 && g > 20) || (g > 30 && b > 30 && Math.abs(r - g) > 5) || (r < 25 && g > 20);
      if (isSquircle) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log('Squircle bounds detected:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });

  // Calculate center of detected squircle
  let cx = Math.round((minX + maxX) / 2);
  let cy = Math.round((minY + maxY) / 2);
  let size = Math.max(maxX - minX, maxY - minY);

  // Add small padding around squircle
  const pad = Math.round(size * 0.05);
  size += pad * 2;

  // Ensure crop is within image bounds
  let cropX = Math.max(0, Math.min(width - size, Math.round(cx - size / 2)));
  let cropY = Math.max(0, Math.min(height - size, Math.round(cy - size / 2)));
  let cropSize = Math.min(size, width - cropX, height - cropY);

  console.log('Crop rectangle:', { cropX, cropY, cropSize });

  // 1. Crop to square PNG of the exact logo
  const croppedSquareBuffer = await sharp(srcPath)
    .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
    .toFormat('png')
    .toBuffer();

  // Save public/logo.png
  fs.writeFileSync('public/logo.png', croppedSquareBuffer);
  console.log('Saved public/logo.png');

  // Also save uncropped exact image as public/logo-full.jpg
  fs.copyFileSync('public/logo.jpg', 'public/logo-full.jpg');

  // 2. Generate PWA and Favicon icons from the exact logo image
  const sizes = [
    { name: 'public/icon-512.png', size: 512 },
    { name: 'public/icon-192.png', size: 192 },
    { name: 'public/apple-touch-icon.png', size: 180 },
    { name: 'public/apple-touch-icon-precomposed.png', size: 180 },
    { name: 'public/favicon-32x32.png', size: 32 },
    { name: 'public/favicon-16x16.png', size: 16 },
  ];

  for (const { name, size } of sizes) {
    const resized = await sharp(croppedSquareBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 9, g: 20, b: 15, alpha: 1 } })
      .toFormat('png')
      .toBuffer();
    fs.writeFileSync(name, resized);
    console.log(`Generated ${name}`);
  }

  // Generate app/favicon.ico & public/favicon.ico (32x32 PNG inside ico structure or sharp multi-resolution ICO if supported)
  const icoBuffer = await sharp(croppedSquareBuffer)
    .resize(32, 32)
    .toFormat('png')
    .toBuffer();

  // We can write 32x32 png as favicon or use png as favicon
  fs.writeFileSync('app/favicon.ico', icoBuffer);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('Updated app/favicon.ico and public/favicon.ico');
}

processLogo().catch(err => {
  console.error(err);
  process.exit(1);
});

