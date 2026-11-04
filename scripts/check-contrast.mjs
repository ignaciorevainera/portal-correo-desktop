#!/usr/bin/env node
/**
 * Contrast check for Portal Correo Desktop design tokens.
 *
 * Reads the real tokens from src/index.css (light :root and .dark), converts
 * OKLCH to sRGB and reports WCAG 2.1 contrast for the pairs that matter to the
 * operator workflow. Sin `--strict`, el exit code es 1 sólo si un par de texto
 * queda por debajo de 4.5:1 y no está documentado en `EXCEPTIONS`.
 *
 * Usage: node scripts/check-contrast.mjs [--strict]
 *   --strict ignora las excepciones y exige 0 fallas de texto.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, "../src/index.css");
const css = readFileSync(cssPath, "utf8")
  // Quita comentarios de bloque (también multilínea) y de línea antes de parsear.
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

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
  for (const rawLine of body.split("\n")) {
    // Red de seguridad para comentarios inline que hayan quedado en la línea.
    const line = rawLine.replace(/\/\*.*?\*\//g, "");
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
  { t: "light", fg: "link", bg: "card", kind: "text", label: "Link / acento" },
  {
    // Restricción: link sobre muted solo se modela en claro (4.82:1). En oscuro
    // da 4.02:1 y no se usa como texto: los labels de Topbar pasaron a foreground.
    t: "light",
    fg: "link",
    bg: "muted",
    kind: "text",
    label: "Link sobre muted",
  },
  { t: "light", fg: "success-foreground", bg: "success", kind: "text", label: "Éxito sólido" },
  {
    t: "light",
    fg: "destructive-foreground",
    bg: "destructive",
    kind: "text",
    label: "Destructivo sólido",
  },
  {
    t: "light",
    fg: "destructive",
    bg: "destructive",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Botón destructive (10%)",
  },
  {
    // El detener usa destructive sólido con hover al 90% sobre card.
    t: "light",
    fg: "destructive-foreground",
    bg: "destructive",
    bgAlpha: 0.9,
    bgOver: "card",
    kind: "text",
    label: "Destructivo sólido (hover)",
  },
  {
    t: "light",
    fg: "destructive",
    bg: "destructive",
    bgAlpha: 0.15,
    bgOver: "card",
    kind: "text",
    label: "Destructivo sobre tinte 15",
  },
  { t: "light", fg: "success", bg: "card", kind: "text", label: "Texto success" },
  { t: "light", fg: "warning", bg: "card", kind: "text", label: "Texto warning" },
  { t: "light", fg: "info", bg: "card", kind: "text", label: "Texto info" },
  { t: "light", fg: "destructive", bg: "card", kind: "text", label: "Texto destructivo" },
  {
    t: "light",
    fg: "success",
    bg: "success",
    bgAlpha: 0.15,
    bgOver: "card",
    kind: "text",
    label: "Tinte success/15",
  },
  {
    t: "light",
    fg: "warning",
    bg: "warning",
    bgAlpha: 0.15,
    bgOver: "card",
    kind: "text",
    label: "Tinte warning/15",
  },
  {
    // El cuerpo del Alert usa foreground sobre los tintes de cada variante.
    t: "light",
    fg: "foreground",
    bg: "success",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Texto alerta success",
  },
  {
    t: "light",
    fg: "foreground",
    bg: "warning",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Texto alerta warning",
  },
  {
    t: "light",
    fg: "foreground",
    bg: "destructive",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Texto alerta destructivo",
  },
  { t: "light", fg: "border", bg: "card", kind: "ui", label: "Borde de control" },
  { t: "light", fg: "input", bg: "card", kind: "ui", label: "Borde de input" },

  { t: "dark", fg: "foreground", bg: "background", kind: "text", label: "Texto base" },
  { t: "dark", fg: "muted-foreground", bg: "card", kind: "text", label: "Labels sobre card" },
  { t: "dark", fg: "primary-foreground", bg: "primary", kind: "text", label: "CTA primaria" },
  { t: "dark", fg: "link", bg: "card", kind: "text", label: "Texto link sobre card" },
  { t: "dark", fg: "link", bg: "background", kind: "text", label: "Texto link sobre fondo" },
  { t: "dark", fg: "success-foreground", bg: "success", kind: "text", label: "Éxito sólido" },
  {
    t: "dark",
    fg: "destructive-foreground",
    bg: "destructive",
    kind: "text",
    label: "Destructivo sólido",
  },
  {
    t: "dark",
    fg: "destructive",
    bg: "destructive",
    bgAlpha: 0.15,
    bgOver: "card",
    kind: "text",
    label: "Destructivo sobre tinte 15",
  },
  {
    t: "dark",
    fg: "destructive",
    bg: "destructive",
    bgAlpha: 0.2,
    bgOver: "card",
    kind: "text",
    label: "Botón destructive (20%)",
  },
  {
    // El detener usa destructive sólido con hover al 90% sobre card.
    t: "dark",
    fg: "destructive-foreground",
    bg: "destructive",
    bgAlpha: 0.9,
    bgOver: "card",
    kind: "text",
    label: "Destructivo sólido (hover)",
  },
  { t: "dark", fg: "success", bg: "card", kind: "text", label: "Texto success" },
  { t: "dark", fg: "warning", bg: "card", kind: "text", label: "Texto warning" },
  { t: "dark", fg: "info", bg: "card", kind: "text", label: "Texto info" },
  { t: "dark", fg: "destructive", bg: "card", kind: "text", label: "Texto destructivo" },
  {
    t: "dark",
    fg: "success",
    bg: "success",
    bgAlpha: 0.15,
    bgOver: "card",
    kind: "text",
    label: "Tinte success/15",
  },
  {
    t: "dark",
    fg: "warning",
    bg: "warning",
    bgAlpha: 0.15,
    bgOver: "card",
    kind: "text",
    label: "Tinte warning/15",
  },
  {
    // El cuerpo del Alert usa foreground sobre los tintes de cada variante.
    t: "dark",
    fg: "foreground",
    bg: "success",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Texto alerta success",
  },
  {
    t: "dark",
    fg: "foreground",
    bg: "warning",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Texto alerta warning",
  },
  {
    t: "dark",
    fg: "foreground",
    bg: "destructive",
    bgAlpha: 0.1,
    bgOver: "card",
    kind: "text",
    label: "Texto alerta destructivo",
  },
  { t: "dark", fg: "border", bg: "card", kind: "ui", label: "Borde de control" },

  // La consola es oscura en ambos temas: sus colores de log viven solo en :root.
  { t: "light", fg: "console-fg", bg: "console-bg", kind: "text", label: "Consola texto" },
  { t: "light", fg: "console-muted", bg: "console-bg", kind: "text", label: "Consola muted" },
  { t: "light", fg: "console-success", bg: "console-bg", kind: "text", label: "Consola success" },
  { t: "light", fg: "console-warning", bg: "console-bg", kind: "text", label: "Consola warning" },
  { t: "light", fg: "console-info", bg: "console-bg", kind: "text", label: "Consola info" },
  {
    t: "light",
    fg: "console-destructive",
    bg: "console-bg",
    kind: "text",
    label: "Consola destructivo",
  },
  { t: "dark", fg: "console-fg", bg: "console-bg", kind: "text", label: "Consola texto" },
  { t: "dark", fg: "console-muted", bg: "console-bg", kind: "text", label: "Consola muted" },
  { t: "dark", fg: "console-success", bg: "console-bg", kind: "text", label: "Consola success" },
  { t: "dark", fg: "console-warning", bg: "console-bg", kind: "text", label: "Consola warning" },
  { t: "dark", fg: "console-info", bg: "console-bg", kind: "text", label: "Consola info" },
  {
    t: "dark",
    fg: "console-destructive",
    bg: "console-bg",
    kind: "text",
    label: "Consola destructivo",
  },
];

// Decisión de producto (2026-11-04): se restauraron los valores del preset
// corporativo para --muted-foreground, --destructive, --success y --warning.
// Los pares de texto sobre tintes quedan bajo 4.5:1 y se documentan acá con el
// ratio medido; `--strict` deja de ser un gate verde y pasa a ser diagnóstico.
const EXCEPTIONS = [
  {
    label: "light Labels sobre muted",
    ratio: 4.34,
    reason: "Valor del preset restaurado por decisión de producto; AA no garantizado en el par sobre tinte o muted.",
  },
  {
    label: "light Botón destructive (10%)",
    ratio: 3.99,
    reason: "Valor del preset restaurado por decisión de producto; AA no garantizado en el par sobre tinte o muted.",
  },
  {
    label: "light Destructivo sobre tinte 15",
    ratio: 3.64,
    reason: "Valor del preset restaurado por decisión de producto; AA no garantizado en el par sobre tinte o muted.",
  },
  {
    label: "light Tinte success/15",
    ratio: 4.34,
    reason: "Valor del preset restaurado por decisión de producto; AA no garantizado en el par sobre tinte o muted.",
  },
  {
    label: "light Tinte warning/15",
    ratio: 4.18,
    reason: "Valor del preset restaurado por decisión de producto; AA no garantizado en el par sobre tinte o muted.",
  },
];

const pairLabels = pairs.map((p) => `${p.t} ${p.label}`);
const duplicated = pairLabels.filter((label, index) => pairLabels.indexOf(label) !== index);
if (duplicated.length > 0) {
  console.error(`Etiquetas de par duplicadas: ${[...new Set(duplicated)].join(", ")}`);
  process.exit(1);
}
for (const exception of EXCEPTIONS) {
  const matches = pairLabels.filter((label) => label === exception.label).length;
  if (matches !== 1) {
    console.error(`Excepción sin par único: "${exception.label}" (${matches} coincidencias)`);
    process.exit(1);
  }
}

const strict = process.argv.includes("--strict");

// --------------------------------------------------------------------- report
let textFailures = 0;
let uiFailures = 0;
// Un token ausente es fatal sin importar el kind: el gate nunca pasa por omisión.
let missingFailures = 0;
const rows = [];

for (const pair of pairs) {
  const rowLabel = `${pair.t} ${pair.label}`;
  const tokens = themes[pair.t];
  // Solo los tokens de consola pueden resolver desde :root en el tema oscuro.
  const fixed = (name) => name.startsWith("console-");
  const fg = tokens[pair.fg] ?? (fixed(pair.fg) ? themes.light[pair.fg] : undefined);
  const bg = tokens[pair.bg] ?? (fixed(pair.bg) ? themes.light[pair.bg] : undefined);
  const base = pair.bgOver
    ? tokens[pair.bgOver]?.rgb ??
      (fixed(pair.bgOver) ? themes.light[pair.bgOver]?.rgb : undefined)
    : null;
  const missing = !fg ? pair.fg : !bg ? pair.bg : pair.bgOver && !base ? pair.bgOver : null;
  if (missing) {
    // Un token ausente es una falla real: el gate no puede pasar por omisión.
    missingFailures++;
    rows.push([rowLabel, "—", "—", "—", `FALLA (token ausente: ${missing})`]);
    continue;
  }
  const bgRgb = pair.bgAlpha
    ? composite(bg.rgb, bg.alpha * pair.bgAlpha, base)
    : composite(bg.rgb, bg.alpha, themes[pair.t].card.rgb);
  const fgRgb = composite(fg.rgb, fg.alpha, bgRgb);
  const value = ratio(fgRgb, bgRgb);
  const threshold = pair.kind === "text" ? 4.5 : 3;
  const pass = value >= threshold;
  const candidate = strict
    ? undefined
    : EXCEPTIONS.find((e) => e.label === rowLabel);
  // El ratio documentado es el piso conocido: si el par empeora (baja), deja de estar cubierto.
  const documented = candidate && value >= candidate.ratio - 0.05 ? candidate : undefined;
  const stale = candidate !== undefined && pass;
  const drifted = candidate !== undefined && !pass && value < candidate.ratio - 0.05;

  if (stale || (!pass && !documented)) {
    pair.kind === "text" ? textFailures++ : uiFailures++;
  }

  rows.push([
    rowLabel,
    hex(fgRgb),
    hex(bgRgb),
    value.toFixed(2),
    stale
      ? "excepción obsoleta: el par ya cumple, borrarla"
      : drifted
        ? `empeoró: documentado ${candidate.ratio.toFixed(2)}, hoy ${value.toFixed(2)}`
        : documented
          ? "excepción documentada"
          : pass
            ? "ok"
            : pair.kind === "text"
              ? `FALLA (${threshold}:1)`
              : `decorativo (${value.toFixed(2)}:1, no bloqueante)`,
  ]);
}

const width = rows.reduce((max, row) => Math.max(max, row[0].length), 0);
console.log("\nContraste WCAG — tokens de src/index.css\n");
for (const [label, fg, bg, value, verdict] of rows) {
  console.log(
    `${label.padEnd(width)}  ${fg.padEnd(9)} ${bg.padEnd(9)} ${String(value).padStart(6)}  ${verdict}`,
  );
}
console.log(`\nExcepciones documentadas: ${EXCEPTIONS.length}${strict ? " (ignoradas por --strict)" : " (usar --strict para exigir 0)"}`);
for (const e of EXCEPTIONS) console.log(`  - ${e.label}: ${e.reason}`);
console.log(
  `\nTexto: ${textFailures} par(es) sin documentar bajo 4.5:1 · ${
    strict ? 0 : EXCEPTIONS.length
  } documentado(s) por excepción · UI: ${uiFailures} borde(s) decorativos bajo 3:1 · Tokens ausentes: ${missingFailures}.\n`,
);

process.exit(textFailures > 0 || missingFailures > 0 ? 1 : 0);
