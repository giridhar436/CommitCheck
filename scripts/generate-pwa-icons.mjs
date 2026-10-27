import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const publicIconsDir = path.resolve(process.cwd(), "public/icons");
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

function createSvg({
  size,
  isMaskable = false,
  isApple = false,
}) {
  // Brand color: Airbnb Rausch #ff385c
  const bg = "#ff385c";
  const iconScale = (size * (isMaskable ? 0.52 : 0.58)) / 24;
  const strokeWidth = (2.2 * 24) / 24;
  const offset = (size - 24 * iconScale) / 2;

  let backgroundShape = "";
  if (isMaskable) {
    backgroundShape = `<rect width="${size}" height="${size}" fill="${bg}" />`;
  } else if (isApple) {
    // Apple touch icons are masked by iOS with rounded corners, so full bleed background is best
    backgroundShape = `<rect width="${size}" height="${size}" fill="${bg}" />`;
  } else {
    // Standard icon with rounded squircle
    const rx = Math.round(size * 0.22);
    backgroundShape = `<rect width="${size}" height="${size}" rx="${rx}" fill="${bg}" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${Math.max(1, Math.round(size * 0.015))}" stdDeviation="${Math.max(1, Math.round(size * 0.02))}" flood-color="#000000" flood-opacity="0.18" />
    </filter>
  </defs>
  ${backgroundShape}
  <g transform="translate(${offset}, ${offset}) scale(${iconScale})" filter="url(#shadow)" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </g>
</svg>`;
}

async function run() {
  const configs = [
    { name: "icon-192x192.png", size: 192, isMaskable: false },
    { name: "icon-512x512.png", size: 512, isMaskable: false },
    { name: "maskable-icon-192x192.png", size: 192, isMaskable: true },
    { name: "maskable-icon-512x512.png", size: 512, isMaskable: true },
    { name: "apple-touch-icon.png", size: 180, isApple: true },
  ];

  for (const config of configs) {
    const svg = createSvg(config);
    const dest = path.join(publicIconsDir, config.name);
    await sharp(Buffer.from(svg))
      .resize(config.size, config.size)
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log(`Generated ${config.name} (${config.size}x${config.size})`);
  }

  // Also save base SVG
  const masterSvg = createSvg({ size: 512, isMaskable: false });
  fs.writeFileSync(path.join(publicIconsDir, "icon.svg"), masterSvg, "utf8");
  fs.writeFileSync(path.resolve(process.cwd(), "public/icon.svg"), masterSvg, "utf8");
  console.log("Generated vector SVG icons");
}

run().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
