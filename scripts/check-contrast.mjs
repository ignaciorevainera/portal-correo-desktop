#!/usr/bin/env node
/**
 * Contrast check for Portal Correo Desktop design tokens.
 *
 * Reads the real tokens from src/index.css (light :root and .dark), converts
 * OKLCH to sRGB and reports WCAG 2.1 contrast for the pairs that matter to the
 * operator workflow. Exit code 1 when a *text* pair is below 4.5:1.
 *
 * Usage: node scripts/check-contrast.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, "../src/index.css");
const css = readFileSync(cssPath, "utf8");

// ---------------------------------------------------------------- color math
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (v) => Math.min(1, Math.max(0, v));

function oklchToLinear(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const hexToLinear = (hex) => {
  const n = hex.replace("#", "").trim();
  const full = n.length === 3 ? [...n].map((c) => c + c).join("") : n;
  return [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255));
};

function parseColor(raw) {
  const value = raw.trim();
  const oklch = value.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?))?\s*\)$/i);
  if (oklch) {
    const L = oklch[1].endsWith("%") ? parseFloat(oklch[1]) / 100 : parseFloat(oklch[1]);
    const alpha = oklch[4]
      ? oklch[4].endsWith("%")
        ? parseFloat(oklch[4]) / 100
        : parseFloat(oklch[4])
      : 1;
    return { rgb: oklchToLinear(L, parseFloat(oklch[2]), parseFloat(oklch[3])), alpha };
  }
  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return { rgb: hexToLinear(value), alpha: 1 };
  }
  return null;
}

const hex = (rgb) =>
  "#" + rgb.map((v) => Math.round(toGamma(v) * 255).toString(16).padStart(2, "0")).join("");

const luminance = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const composite = (fg, alpha, bg) =>
  [0, 1, 2].map((i) => toLinear(clamp(toGamma(fg[i]) * alpha + toGamma(bg[i]) * (1 - alpha))));

// ------------------------------------------------------------- token parsing
function parseBlock(selector) {
  const pattern = new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
  const match = pattern.exec(css);
  if (!match) throw new Error(`No se encontró el bloque ${selector} en ${cssPath}`);
  const open = css.indexOf("{", match.index);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const tokens = {};
  for (const line of body.split("\n")) {
    const token = line.match(/^\s*--([\w-]+)\s*:\s*(.+?);\s*$/);
    if (!token) continue;
    const color = parseColor(token[2]);
    if (color) tokens[token[1]] = color;
  }
  return tokens;
}

const themes = {
  light: parseBlock(":root"),
  dark: parseBlock(".dark"),
};

// ---------------------------------------------------------------- pair specs
const pairs = [
  { t: "light", fg: "foreground", bg: "background", kind: "text", label: "Texto base" },
  { t: "light", fg: "muted-foreground", bg: "card", kind: "text", label: "Labels sobre card" },
  { t: "light", fg: "muted-foreground", bg: "muted", kind: "text", label: "Labels sobre muted" },
  {
    t: "light",
    fg: "muted-foreground",
    bg: "muted",
    bgAlpha: 0.5,
    bgOver: "card",
    kind: "text",
    label: "Chip uptime (muted/50)",
  },
  { t: "light", fg: "primary-foreground", bg: "primary", kind: "text", label: "CTA primaria" },
  { t: "light", fg: "primary", bg: "card", kind: "text", label: "Link / acento" },
  { t: "light", fg: "destructive", bg: "card", kind: "text", label: "Texto de error" },
  {
    t: "light",
    fg: "destructive",
    bg: "destructive",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Botón destructive (10%)",
  },
  { t: "light", fg: "border", bg: "card", kind: "ui", label: "Borde de control" },
  { t: "light", fg: "input", bg: "card", kind: "ui", label: "Borde de input" },

  { t: "dark", fg: "foreground", bg: "background", kind: "text", label: "Texto base" },
  { t: "dark", fg: "muted-foreground", bg: "card", kind: "text", label: "Labels sobre card" },
  { t: "dark", fg: "primary-foreground", bg: "primary", kind: "text", label: "CTA primaria" },
  {
    t: "dark",
    fg: "destructive",
    bg: "destructive",
    bgAlpha: 0.2,
    bgOver: "card",
    kind: "text",
    label: "Botón destructive (20%)",
  },
  { t: "dark", fg: "border", bg: "card", kind: "ui", label: "Borde de control" },
];

// --------------------------------------------------------------------- report
let textFailures = 0;
let uiFailures = 0;
const rows = [];

for (const pair of pairs) {
  const tokens = themes[pair.t];
  const fg = tokens[pair.fg];
  const bg = tokens[pair.bg];
  if (!fg || !bg) {
    rows.push([`${pair.t} ${pair.label}`, "token ausente", "—", "—", "SKIP"]);
    continue;
  }
  const base = pair.bgOver ? tokens[pair.bgOver]?.rgb ?? themes[pair.t].card.rgb : null;
  const bgRgb = pair.bgAlpha
    ? composite(bg.rgb, bg.alpha * pair.bgAlpha, base)
    : composite(bg.rgb, bg.alpha, themes[pair.t].card.rgb);
  const fgRgb = composite(fg.rgb, fg.alpha, bgRgb);
  const value = ratio(fgRgb, bgRgb);
  const threshold = pair.kind === "text" ? 4.5 : 3;
  const pass = value >= threshold;
  if (!pass) pair.kind === "text" ? textFailures++ : uiFailures++;
  rows.push([`${pair.t} ${pair.label}`, hex(fgRgb), hex(bgRgb), value.toFixed(2), pass ? "ok" : `FALLA (${threshold}:1)`]);
}

const width = rows.reduce((max, row) => Math.max(max, row[0].length), 0);
console.log("\nContraste WCAG — tokens de src/index.css\n");
for (const [label, fg, bg, value, verdict] of rows) {
  console.log(
    `${label.padEnd(width)}  ${fg.padEnd(9)} ${bg.padEnd(9)} ${String(value).padStart(6)}  ${verdict}`,
  );
}
console.log(
  `\nTexto: ${textFailures} par(es) bajo 4.5:1 · UI: ${uiFailures} borde(s) bajo 3:1.\n`,
);

process.exit(textFailures > 0 ? 1 : 0);
