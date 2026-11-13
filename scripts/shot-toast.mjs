/**
 * Screenshot del toast (caso "puertos bloqueados" con CTA) en varios anchos de
 * ventana, usando el CSS ya compilado de dist.
 *
 * Uso: node scripts/shot-toast.mjs [carpeta-de-salida] [--variant=action|plain]
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliArgs = process.argv.slice(2);
const variantArg = cliArgs.find((a) => a.startsWith("--variant="));
const outArg = cliArgs.find((a) => !a.startsWith("--"));
const variant = variantArg ? variantArg.split("=")[1] : "action";
const outDir = path.resolve(root, outArg || "scripts/shots");
fs.mkdirSync(outDir, { recursive: true });

const assetsDir = path.join(root, "dist", "assets");
const tailwindFile = fs.readdirSync(assetsDir).find((f) => /^index-.*\.css$/.test(f));
const tailwindCss = fs.readFileSync(path.join(assetsDir, tailwindFile), "utf8");
const sonnerCss = fs.readFileSync(path.join(root, "node_modules", "sonner", "dist", "styles.css"), "utf8");

const html = `file:///${path.join(root, "scripts", "toast-harness.html").replace(/\\/g, "/")}?variant=${variant}`;

const VIEWPORTS = [
  { w: 320, h: 360 },
  { w: 420, h: 460 },
  { w: 1020, h: 460 },
];

const browser = await chromium.launch({ headless: true });
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
  await page.goto(html);
  await page.addStyleTag({ content: tailwindCss });
  await page.addStyleTag({ content: sonnerCss });
  await page.waitForSelector("[data-sonner-toast]");
  await page.waitForTimeout(400);
  const file = path.join(outDir, `toast-${variant}-${vp.w}.png`);
  await page.screenshot({ path: file });
  console.log(file);
  await page.close();
}
await browser.close();
