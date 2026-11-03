# Preset shadcn `b5XRZYXrNg` (sitio principal)

Captura de evidencia para la Fase 1. El JSON crudo está en `shadcn-preset-decode.json`.

| Campo | Valor |
|---|---|
| Comando | `npx shadcn@latest preset decode b5XRZYXrNg --json` |
| CLI (pin del repo) | `shadcn@4.23.0` |
| CLI (captura) | `shadcn@4.23.0` (vía `npx shadcn@latest`; se verificó que `4.22.1` emite un JSON idéntico) |
| Fecha | `2026-11-03` |
| `style` (preset) | `vega` |
| `base` (proyecto) | `radix` → por eso `components.json` usa `radix-vega` |
| `baseColor` | `neutral` |
| `theme` | `blue` |
| `chartColor` | `orange` |
| `iconLibrary` | `lucide` |
| `font` | `geist` |
| `fontHeading` | `roboto-slab` |
| `radius` | `small` |
| `menuAccent` | `bold` |
| `menuColor` | `default` |
| URL | https://ui.shadcn.com/create?preset=b5XRZYXrNg |

> `style: vega` es el valor **sin** prefijo de base; la base vive en `components.json` (`"style": "radix-vega"`).

> Nota de procedencia: el repo fija `shadcn@4.23.0`; la captura se ejecutó con `npx shadcn@latest`, que al momento resolvía `4.23.0`, y se comprobó que `shadcn@4.22.1` emite un JSON idéntico.
