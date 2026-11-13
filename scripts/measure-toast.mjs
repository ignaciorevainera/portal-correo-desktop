/**
 * Mide el layout real del toast (ancho de la columna de texto, del CTA y
 * alto total) en varios anchos de ventana, usando el CSS compilado de dist
 * + los estilos de Sonner, en el mismo orden en que la app los carga.
 *
 * Uso: node scripts/measure-toast.mjs [--variant=action|plain]
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const variantArg = args.find((a) => a.startsWith("--variant="));
const variant = variantArg ? variantArg.split("=")[1] : "action";

// --- CSS igual que en la app: Tailwind (build) primero, Sonner después -----
const assetsDir = path.join(root, "dist", "assets");
const tailwindFile = fs
  .readdirSync(assetsDir)
  .find((f) => /^index-.*\.css$/.test(f));
if (!tailwindFile) {
  console.error("No se encontró dist/assets/index-*.css (corré `npm run build`).");
  process.exit(1);
}
const tailwindCss = fs.readFileSync(path.join(assetsDir, tailwindFile), "utf8");
const sonnerCss = fs.readFileSync(
  path.join(root, "node_modules", "sonner", "dist", "styles.css"),
  "utf8"
);

const html = `file:///${path
  .join(root, "scripts", "toast-harness.html")
  .replace(/\\/g, "/")}?variant=${variant}`;

const VIEWPORTS = [
  { w: 320, h: 400, label: "ventana monitor mínima (320)" },
  { w: 420, h: 600, label: "ventana principal mínima (420)" },
  { w: 512, h: 700, label: "ventana media (512)" },
  { w: 1020, h: 700, label: "ventana principal default (1020)" },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  await page.goto(html);
  await page.addStyleTag({ content: tailwindCss });
  await page.addStyleTag({ content: sonnerCss });
  await page.waitForSelector("[data-sonner-toast]");

  const m = await page.evaluate(() => {
    const toast = document.querySelector("[data-sonner-toast]");
    const icon = document.querySelector("[data-icon]");
    const content = document.querySelector("[data-content]");
    const title = document.querySelector("[data-title]");
    const desc = document.querySelector("[data-description]");
    const btn = document.querySelector("[data-button]");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        w: Math.round(b.width * 10) / 10,
        h: Math.round(b.height * 10) / 10,
        top: Math.round(b.top * 10) / 10,
        left: Math.round(b.left * 10) / 10,
      };
    };
    const cs = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    return {
      toast: r(toast),
      icon: r(icon),
      content: r(content),
      title: r(title),
      desc: r(desc),
      btn: r(btn),
      toastPadding: cs(toast, "padding"),
      contentFlex: cs(content, "flex"),
      contentWrap: cs(toast, "flexWrap"),
      titleFontSize: cs(title, "fontSize"),
      descFontSize: cs(desc, "fontSize"),
      btnFontSize: cs(btn, "fontSize"),
      // ¿el botón queda a la derecha del texto (misma fila) o debajo?
      stacked: btn && content ? btn.getBoundingClientRect().top >= content.getBoundingClientRect().bottom - 1 : null,
      // ¿el icono quedó solo en una fila, separado del texto?
      iconSolo: icon && content ? icon.getBoundingClientRect().bottom <= content.getBoundingClientRect().top + 1 : null,
    };
  });

  results.push({ viewport: vp, ...m });
  await page.close();
}
await browser.close();

for (const r of results) {
  const t = r.toast;
  const c = r.content;
  const b = r.btn;
  console.log(`\n=== ${r.viewport.label} — ${variant} ===`);
  console.log(`  toast          : ${t.w} x ${t.h} px, x ${t.left}→${t.left + t.w} (margen izq ${t.left}, der ${r.viewport.w - t.left - t.w}) (padding ${r.toastPadding})`);
  console.log(`  icono          : ${r.icon ? `${r.icon.w} x ${r.icon.h} @ (${r.icon.left},${r.icon.top})${r.iconSolo ? "  ← SOLO EN SU FILA" : ""}` : "sin icono"}`);
  console.log(`  columna texto  : ${c.w} x ${c.h} px  (flex: ${r.contentFlex}, wrap: ${r.contentWrap})`);
  if (r.title) console.log(`  title          : ${r.title.w} x ${r.title.h} px  (${r.titleFontSize})`);
  if (r.desc) console.log(`  description    : ${r.desc.w} x ${r.desc.h} px  (${r.descFontSize})`);
  if (b) console.log(`  CTA            : ${b.w} x ${b.h} px  (${r.btnFontSize}) — ${r.stacked ? "DEBAJO del texto" : "AL LADO del texto"}`);
  console.log(`  desbordes       : ${t.left < 0 || t.left + t.w > r.viewport.w ? "SÍ" : "no"}`);
}
