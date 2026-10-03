// Erzeugt die PNG-Icons aus web/icons/icon.svg (benötigt Playwright mit Chromium).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // NODE_PATH muss auf die globalen Module zeigen
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../web/icons/", import.meta.url));
const svg = readFileSync(dir + "icon.svg", "utf8");
const browser = await chromium.launch({ });
const page = await browser.newPage();
async function png(size, file, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable
    ? `<div style="width:100%;height:100%;background:#2c3a66;display:grid;place-items:center"><div style="width:72%;height:72%">${svg.replace(/<rect[^>]*\/>/, "")}</div></div>`
    : svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
  await page.setContent(`<body style="margin:0;background:transparent">${inner}</body>`);
  await page.screenshot({ path: dir + file, omitBackground: true });
}
await png(192, "icon-192.png");
await png(512, "icon-512.png");
await png(180, "apple-touch-icon.png");
await png(512, "icon-maskable-512.png", { maskable: true });
await browser.close();
