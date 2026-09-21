import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Exact SVG Vector implementation of the official Friends Tr$cker logo
const officialLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Squircle Gradient -->
    <linearGradient id="squircleBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#243C7D"/>
      <stop offset="45%" stop-color="#1B2E64"/>
      <stop offset="100%" stop-color="#121F45"/>
    </linearGradient>

    <!-- Squircle Border Gradient -->
    <linearGradient id="squircleBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#3B82F6" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#1E40AF" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Main Vibrant Green Gradient for FT Ribbon -->
    <linearGradient id="ftRibbonGreen" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="30%" stop-color="#22C55E"/>
      <stop offset="70%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#4ADE80"/>
    </linearGradient>

    <!-- Arrowhead Highlight Gradient -->
    <linearGradient id="ftArrowHead" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22C55E"/>
      <stop offset="50%" stop-color="#4ADE80"/>
      <stop offset="100%" stop-color="#86EFAC"/>
    </linearGradient>

    <!-- Shadow/Depth Ribbon Gradient -->
    <linearGradient id="ftRibbonShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>

    <!-- Soft Outer Ambient Glow -->
    <filter id="logoGlow" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur stdDeviation="8" result="glow"/>
      <feComposite in="SourceGraphic" in2="glow" operator="over"/>
    </filter>

    <!-- Drop shadow for the squircle -->
    <filter id="squircleShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#050914" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Deep Blue Rounded Squircle Container -->
  <rect
    x="32"
    y="32"
    width="448"
    height="448"
    rx="118"
    ry="118"
    fill="url(#squircleBg)"
    stroke="url(#squircleBorder)"
    stroke-width="2.5"
    filter="url(#squircleShadow)"
  />

  <!-- FT Symbol with Upward Ascending Arrow -->
  <g filter="url(#logoGlow)" transform="translate(0, -6)">
    <!-- 1. Left 'F' Upper Rounded Arch & Loop -->
    <path
      d="M 152 208 V 162 C 152 134 174 112 202 112 H 272 C 298 112 318 132 318 158 C 318 184 298 204 272 204 H 198"
      fill="none"
      stroke="url(#ftRibbonGreen)"
      stroke-width="38"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- 2. Left 'F' Middle Crossbar -->
    <path
      d="M 152 258 H 244"
      stroke="url(#ftRibbonGreen)"
      stroke-width="38"
      stroke-linecap="round"
    />

    <!-- 3. Left 'F' Lower Vertical Stem -->
    <path
      d="M 152 208 V 292"
      stroke="url(#ftRibbonGreen)"
      stroke-width="38"
      stroke-linecap="round"
    />

    <!-- 4. Anchor Circle Dot -->
    <circle cx="152" cy="358" r="23" fill="url(#ftRibbonGreen)" />

    <!-- 5. 'T' Loop with Ascending Ribbon Curve -->
    <path
      d="M 264 246 V 316 C 264 348 284 368 314 368 C 344 368 366 348 366 316 V 230 C 366 192 384 152 414 112"
      fill="none"
      stroke="url(#ftRibbonGreen)"
      stroke-width="38"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- 6. Stylized Sharp 3D Arrowhead -->
    <polygon
      points="346,128 440,90 410,184 384,152"
      fill="url(#ftArrowHead)"
      stroke="url(#ftArrowHead)"
      stroke-width="4"
      stroke-linejoin="round"
    />
  </g>

  <!-- "Friends Tr$cker" Typography Centered at Bottom -->
  <g transform="translate(256, 428)" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Inter', 'Segoe UI', Roboto, sans-serif">
    <text y="0" font-size="28" font-weight="600" letter-spacing="-0.3">
      <tspan fill="#D8E2F0">Friends </tspan>
      <tspan fill="#FFFFFF" font-weight="700">Tr</tspan>
      <tspan fill="#22C55E" font-weight="800">$</tspan>
      <tspan fill="#FFFFFF" font-weight="700">cker</tspan>
    </text>
  </g>
</svg>`;

async function generateAssets() {
  const assetsDir = path.resolve('public/assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Save icon.svg
  fs.writeFileSync(path.resolve('public/icon.svg'), officialLogoSvg);
  fs.writeFileSync(path.resolve('public/assets/friends-tracker-logo.svg'), officialLogoSvg);

  const svgBuffer = Buffer.from(officialLogoSvg);

  // 2. Generate PNG sizes
  const sizes = [
    { file: 'public/assets/friends-tracker-logo.png', width: 512, height: 512 },
    { file: 'public/logo.png', width: 512, height: 512 },
    { file: 'public/favicon.png', width: 64, height: 64 },
    { file: 'public/apple-touch-icon.png', width: 180, height: 180 },
    { file: 'public/pwa-192x192.png', width: 192, height: 192 },
    { file: 'public/pwa-512x512.png', width: 512, height: 512 },
    { file: 'public/pwa-maskable-512x512.png', width: 512, height: 512 }
  ];

  for (const item of sizes) {
    await sharp(svgBuffer)
      .resize(item.width, item.height)
      .png()
      .toFile(path.resolve(item.file));
    console.log(`Generated ${item.file} (${item.width}x${item.height})`);
  }

  console.log('All logo assets successfully generated!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
