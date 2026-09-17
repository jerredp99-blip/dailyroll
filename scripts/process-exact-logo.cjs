const fs = require('fs');
const path = require('path');
const sharpPath = path.resolve('node_modules/.pnpm/sharp@0.35.4_@types+node@20.19.43/node_modules/sharp/dist/index.cjs');
const sharp = require(sharpPath);

async function processLogo() {
  const srcPath = path.resolve('public/logo.jpg');
  if (!fs.existsSync(srcPath)) {
    console.error('public/logo.jpg does not exist');
    process.exit(1);
  }

  const image = sharp(srcPath);
  const metadata = await image.metadata();
  console.log('Original image dimensions:', metadata.width, metadata.height);

  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Exclude bottom right corner sparkle (x > 720, y > 800)
      if (x > 720 && y > 800) continue;

      // Squircle green container boundary or cyan die
      const isSquircle = (g > r + 8 && g > 18) || (g > 25 && b > 25 && Math.abs(r - g) > 5) || (r < 25 && g > 18);
      if (isSquircle) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log('Squircle bounds detected:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY });

  let cx = Math.round((minX + maxX) / 2);
  let cy = Math.round((minY + maxY) / 2);
  let size = Math.max(maxX - minX, maxY - minY);

  const pad = Math.round(size * 0.04);
  size += pad * 2;

  let cropX = Math.max(0, Math.min(width - size, Math.round(cx - size / 2)));
  let cropY = Math.max(0, Math.min(height - size, Math.round(cy - size / 2)));
  let cropSize = Math.min(size, width - cropX, height - cropY);

  console.log('Crop rectangle:', { cropX, cropY, cropSize });

  const croppedSquareBuffer = await sharp(srcPath)
    .extract({ left: cropX, top: cropY, width: cropSize, height: cropSize })
    .toFormat('png')
    .toBuffer();

  fs.writeFileSync('public/logo.png', croppedSquareBuffer);
  console.log('Saved public/logo.png');

  fs.copyFileSync('public/logo.jpg', 'public/logo-full.jpg');

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

  const icoBuffer = await sharp(croppedSquareBuffer)
    .resize(32, 32)
    .toFormat('png')
    .toBuffer();

  fs.writeFileSync('app/favicon.ico', icoBuffer);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('Updated app/favicon.ico and public/favicon.ico');
}

processLogo().catch(err => {
  console.error(err);
  process.exit(1);
});

