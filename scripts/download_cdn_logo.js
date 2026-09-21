import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const CDN_URL = 'https://cdn.phototourl.com/free/2026-09-21-6c1d255c-93c1-45f7-89af-bfceae4a0ece.png';

async function downloadAndProcessLogo() {
  console.log('Fetching logo from CDN:', CDN_URL);
  const response = await fetch(CDN_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const publicDir = path.join(process.cwd(), 'public');
  const assetsDir = path.join(publicDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Save master high-res asset
  fs.writeFileSync(path.join(assetsDir, 'friends-tracker-logo.png'), buffer);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);

  // 2. Generate icons for favicon & PWA
  await sharp(buffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
  await sharp(buffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(buffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(buffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Successfully saved logo assets in all standard resolutions!');
}

downloadAndProcessLogo().catch(err => {
  console.error('Error downloading logo:', err);
  process.exit(1);
});
