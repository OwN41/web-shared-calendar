// Generates the browser and app icons from one drawing. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const BG = "#2563eb";

const calendar = `
  <rect x="116" y="132" width="280" height="272" rx="40" fill="#fff"/>
  <path d="M116 172a40 40 0 0 1 40-40h200a40 40 0 0 1 40 40v36H116z" fill="#1e3a8a"/>
  <rect x="170" y="104" width="26" height="62" rx="13" fill="#1e3a8a" stroke="#fff" stroke-width="8"/>
  <rect x="316" y="104" width="26" height="62" rx="13" fill="#1e3a8a" stroke="#fff" stroke-width="8"/>
  <g fill="#93c5fd">
    <circle cx="180" cy="262" r="19"/><circle cx="256" cy="262" r="19"/><circle cx="332" cy="262" r="19"/>
    <circle cx="180" cy="340" r="19"/><circle cx="332" cy="340" r="19"/>
  </g>
  <circle cx="256" cy="340" r="23" fill="#f97316"/>`;

const svg = (shape, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${shape}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${calendar}</g>
</svg>`;

const square = (r) => `<rect width="512" height="512" rx="${r}" fill="${BG}"/>`;
const circle = `<circle cx="256" cy="256" r="256" fill="${BG}"/>`;

const render = (markup, size) => sharp(Buffer.from(markup)).resize(size, size).png();
const write = async (file, buf) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
};

// Browser
await write(path.join(root, "app", "icon.svg"), svg(square(112)));
await write(path.join(root, "app", "apple-icon.png"), await render(svg(square(0)), 180).toBuffer());
await rm(path.join(root, "app", "favicon.ico"), { force: true });

// Android launcher icons
const res = path.join(root, "android", "app", "src", "main", "res");
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const adaptive = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
for (const [d, size] of Object.entries(legacy)) {
  await write(path.join(res, `mipmap-${d}`, "ic_launcher.png"), await render(svg(square(112)), size).toBuffer());
  await write(path.join(res, `mipmap-${d}`, "ic_launcher_round.png"), await render(svg(circle, 0.9), size).toBuffer());
}
for (const [d, size] of Object.entries(adaptive)) {
  await write(path.join(res, `mipmap-${d}`, "ic_launcher_foreground.png"), await render(svg("", 0.62), size).toBuffer());
}
await write(
  path.join(res, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
);

// iOS (opaque, the OS applies the corner mask)
await write(
  path.join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png"),
  await render(svg(square(0)), 1024).flatten({ background: BG }).toBuffer(),
);

console.log("Icons generated");
