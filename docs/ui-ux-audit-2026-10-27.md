# Auditoría UI/UX — Portal Correo Desktop

**Fecha:** 2026-10-27
**Alcance:** `src/App.tsx`, `Topbar`, `QuickActionsBar`, `TerminalTechnicalCard`, `LivePingConsole`, `AlertsPanel`, `ResetUptimePanel`, `OperatorContextMenu`, `SubnetScannerDrawer`, primitivas `src/components/ui/*`, tokens de `src/index.css`.
**Marco:** `ui-ux-pro-max` (prioridades §1 Accesibilidad, §2 Interacción, §5 Layout, §6 Tipografía y color) + WCAG 2.1 AA / 2.5.8.
**Restricción de producto que manda sobre todo lo demás:** ventana `1020×680`, máx. `1200×800`, `maximizable: false` (`electron/main.cjs:131-139`). No hay espacio vertical que ganar: hay que **elegir qué se ve**.

---

## 1. Veredicto

1. **La app es compacta, pero por la vía equivocada:** la densidad se logró bajando tipografía a 10–11 px (90 casos) y áreas de clic a 14–24 px, no ordenando la información. El operador no lee más rápido: lee más chico.
2. **La búsqueda no busca.** El desplegable del buscador filtra únicamente el historial local de 5 terminales (`Topbar.tsx:126-132`); una terminal nueva no aparece hasta presionar Enter a ciegas. Es el hallazgo más caro para la tarea declarada ("buscar una terminal").
3. **La consola de diagnóstico vacía ocupa 291 px de 680 (43 %)** y empuja Alertas fuera del primer scroll: en el estado por defecto el 43 % de la ventana es un rectángulo negro que dice "selecciona una acción".
4. **El contraste falla en los estados que más importan:** los badges de alerta/estado están entre 2,3:1 y 3,3:1 (mínimo AA 4,5:1); el botón destructivo de shadcn queda en 3,99:1.
5. **shadcn está bien adoptado como base (11 primitivas, `data-slot`, tokens OKLCH), pero se abandona justo donde más se necesita:** buscador, tablas, drawer y menú contextual están hechos a mano, y tres componentes legacy (`HardwareCard`, `NetworkAdCard`, `Sidebar`) siguen vivos solo para los tests.

**Los 3 cambios con mejor relación impacto/hora:** (a) buscador con catálogo real + combobox accesible, (b) consola colapsable con resumen de una línea, (c) ficha con identidad y estado arriba y una sola grilla de datos alineada.

---

## 2. Método y límites

- Revisión estática de código con cita `archivo:línea` para cada hallazgo.
- La revisión se hizo sobre el **working tree actual**: hay 11 archivos con cambios sin commitear, así que los números de línea corresponden a ese estado y no a `HEAD`.
- Cálculo de contraste WCAG sobre los tokens reales (`oklch` → sRGB → luminancia relativa), incluyendo composiciones con alfa (`bg-muted/50`, `amber-500/15`, etc.).
- Inventario de primitivas shadcn instaladas vs. markup propio que las duplica.
- **No** se hicieron capturas ni medición en runtime (no hay Playwright/Storybook en el repo). Las alturas son estimadas a partir de las clases (`h-14`, `h-8`, `h-64`, `p-2.5`) y se marcan con `≈`. El paso siguiente natural es fijar esas métricas con un test visual.

---

## 3. Contrato de diseño propuesto (previo a tocar código)

| ID | Regla | Se verifica con |
|----|-------|-----------------|
| **D1** | **Respuesta primero:** al seleccionar una terminal, lo primero que se ve es *identidad* (hostname) + *estado* (en línea / ping / uptime) + *sede y usuario*. Los detalles técnicos van después. | Orden de bloques en `App.tsx` |
| **D2** | **Piso tipográfico 12 px.** 18/14/12/11. `11 px` solo para overline o metadato terciario; `10 px` y `9 px` prohibidos. Valores críticos en `13 px` mono. | Test de contrato / grep |
| **D3** | **Target mínimo 24×24 px** (WCAG 2.5.8), 32 px en acciones primarias y en controles de fila. Nunca íconos de 14 px clicables. | Test de contrato |
| **D4** | **Contraste medido, no supuesto:** texto ≥ 4,5:1; íconos y bordes de control ≥ 3:1; estados semánticos legibles sobre su propio tinte. | `scripts/check-contrast.mjs` en CI |
| **D5** | **shadcn primero:** toda interacción nueva usa una primitiva (`Command`, `Table`, `Sheet`, `ContextMenu`, `Tooltip`, `Collapsible`, `Skeleton`). El markup propio solo compone, no reimplementa. | Revisión + `data-slot` |
| **D6** | **Densidad por grilla, no por achique:** ritmo 4/8, filas de 28–32 px, padding de card 12 px, gaps 8–12 px. Se recorta información, no tamaño de letra. | Inspección |
| **D7** | **Estado = texto + ícono + color.** Nunca color solo; nunca `animate-pulse` sobre texto. | Revisión |

---

## 4. P0 — Bloquean la tarea del operador

### P0-1 · El buscador no busca: sugiere solo el historial

**Evidencia:** `Topbar.tsx:126-132`

```ts
const filteredMatches = query.trim()
  ? recentSearches.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
  : recentSearches.slice(0, 5);
```

**Qué pasa:** el panel se rotula "Coincidencias (n)" (`Topbar.tsx:283`) pero `recentSearches` sale de `localStorage` (`Topbar.tsx:62-74`). Si el operador escribe `PC-SUCURSAL-117` y nunca la abrió, no ve nada; el dropdown ni siquiera se abre (`isOpen && filteredMatches.length > 0`). Tampoco hay estado "sin coincidencias", ni carga, ni sugerencia por IP parcial. La única forma de avanzar es Enter a ciegas y esperar el "no se encontró".

**Impacto:** es exactamente la tarea que el usuario pidió priorizar. Hoy el buscador funciona como "historial de recientes", no como buscador. Ojo: ya existe `TopbarSearchNavigation.test.tsx` con navegación por flechas/Enter, pero valida sobre el historial — la cobertura de teclado está, el catálogo no.

**Fix (shadcn):** `Command` dentro de `Popover` anclado al input (patrón combobox):

- `Command shouldFilter={false}` + búsqueda contra `getAllTerminals()` (`terminalService.ts:88`) con debounce 120 ms; el historial pasa a ser un `CommandGroup heading="Recientes"`.
- Resultado por fila: hostname (mono 13 px) + IP + sede, y acciones VNC/Ping como `CommandItem` con `onSelect` (hoy son 3 botones de 24 px dentro del `li`, `Topbar.tsx:330-372`).
- Estado vacío con acción: "No hay coincidencias · Buscar en Portal MDA".
- Accesibilidad gratis: `role="combobox"`, `aria-activedescendant`, navegación con flechas ya resuelta.
- Mantener `Ctrl+F` y `Ctrl+Espacio`.

**Costo:** ≈ 4 h. **Riesgo:** bajo (se conserva `onSelectTerminal`).

---

### P0-2 · El menú contextual propio rompe copiar/pegar y la selección de texto

**Evidencia:** `App.tsx:383-387`

```tsx
onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
className="h-screen w-screen overflow-hidden bg-background ... select-none ..."
```

**Qué pasa:**

1. El `preventDefault` es global: también dentro del `<Input>` del buscador (`Topbar.tsx:236`) y del `<Textarea>` de alertas (`AlertsPanel.tsx:145`). El operador que hace clic derecho para **pegar** un hostname que copió de un ticket recibe un menú con "Abrir Portal MDA". No hay "Pegar".
2. `select-none` global impide seleccionar el texto de una alerta, un mensaje de error o un serial. Solo la consola lo revierte (`LivePingConsole.tsx:277` `select-text`).
3. El menú no tiene `role="menu"`, ni navegación por teclado, ni foco inicial. Se cierra con Escape, nada más (`OperatorContextMenu.tsx:42-58`).

**Fix:** interceptar el contexto **solo** fuera de `input, textarea, [contenteditable]`; borrar `select-none` del root y dejarlo únicamente en `app-drag-region` y en los botones. Migrar a `ContextMenu` de Radix/shadcn, que ya trae teclado, foco y submenú. Si se quiere conservar el menú propio, agregar "Pegar" cuando el target sea editable.

**Costo:** ≈ 3 h. **Riesgo:** bajo.

---

### P0-3 · La consola vacía se come la pantalla y esconde Alertas

**Evidencia:** `App.tsx:491-502` (siempre renderiza) + `LivePingConsole.tsx:194,277`

```
<div className="w-full shrink-0 ...">          // header ≈ 34 px
  <div className="h-64 min-h-[16rem] ...">     // 256 px fijos
```

**Qué pasa:** el bloque mide ≈ 291 px **aunque no haya ping**. Presupuesto vertical en 1020×680:

| Bloque | Alto aprox. | Acumulado |
|---|---:|---:|
| Topbar (`h-14`) | 56 | 56 |
| Barra de acciones + borde | 51 | 107 |
| Padding de `<main>` | 14 | 121 |
| Ficha técnica (4 cards + fila AV) | ≈ 193 | 314 |
| Gap | 16 | 330 |
| **Consola vacía** | **291** | **621** |
| Alertas | — | arranca ≈ 621 |

El `<main>` útil mide ≈ 573 px: **Alertas y Reseteos no existen en el primer scroll**. El estado por defecto del operador es un rectángulo negro de 256 px con el texto "Selecciona una acción…".

**Fix:** `Collapsible` (o `Tabs` Resumen/Consola) con dos estados:

- **Colapsada (32 px):** `▸ Consola · último ping 14:32 · 4/4 · 14 ms` + botón "Abrir". Si nunca corrió: `▸ Consola de diagnóstico` sin altura extra.
- **Expandida:** los 256 px actuales, solo bajo acción explícita del operador.
- Al lanzar Ping/Diag desde la barra, se abre sola (no al seleccionar la terminal).
- Ganancia: **+259 px**; Alertas entra completa en 1020×680.

**Costo:** ≈ 3 h. **Riesgo:** medio-bajo (hay tests de `LivePingConsole`; el `data-testid="terminal-scroll-container"` se conserva).

---

## 5. P1 — Legibilidad, contraste y precisión

### P1-1 · 90 textos por debajo de 12 px

| Tamaño | Usos | Dónde | Problema |
|---|---:|---|---|
| 9 px | `Kbd` (`ui/kbd.tsx:11`) | atajos Ctrl+F, F2/F4 | Ilegible; es la ayuda de teclado |
| 10 px | **40** | labels de ficha, badges, overlines, drawer | Bajo el piso de 12 px; mayúsculas + `tracking-wider` + `muted-foreground` |
| 11 px | **50** | tablas, botones de consola, uptime | Aceptable solo como terciario; hoy es tamaño de dato |
| 11.5 px | consola | logs | Correcto para log monoespaciado |

**Fix:** escala 18 (hostname) / 14 (valores) / 12 (labels) / 11 (overline, máximo 5 usos). Las etiquetas dejan de ser mayúsculas de 10 px con tracking: pasan a 11 px normales, color `muted-foreground`, y el valor en `font-medium`/`font-mono` 13 px. Con `tabular-nums` en IP, MAC, uptime y fechas.

### P1-2 · Contraste: fallan los estados que el operador mira primero

Ver §7. Los tres casos graves:

- `text-amber-600` sobre `bg-amber-500/15` = **2,84:1** (`AlertsPanel.tsx:212`). Es el badge "Activa".
- `text-emerald-600` sobre `bg-emerald-500/15` = **3,27:1** (`AlertsPanel.tsx:213`). Es el badge "Cerrada".
- `variant="destructive"` de shadcn (texto `--destructive` sobre `destructive/10`) = **3,99:1**; se usa en "Detener" (`QuickActionsBar.tsx:274`) y en "Detener ping" (`LivePingConsole.tsx:208`).

**Fix por tokens, no por parche:** subir `--muted-foreground` de `oklch(0.556)` a `oklch(0.505)` (4,73 → ≈5,7:1 sobre blanco, 4,34 → ≈5,2:1 sobre `muted`); usar `emerald-800`/`amber-800` para texto sobre tinte (o quitar el tinte y dejar borde + ícono); y en el variant destructivo usar `text-destructive` sobre `bg-background` con borde, o bajar `--destructive` a `oklch(0.55 0.24 27)` solo para texto. Nada de esto cambia la identidad visual.

### P1-3 · Áreas de clic de 14 px

| Control | Tamaño | Evidencia |
|---|---|---|
| Copiar Hostname / IP / MAC / CPU / Usuario | **14×14** | `TerminalTechnicalCard.tsx:57,93,122,206,268` (`h-3.5 w-3.5 p-0`) |
| Quitar del historial | 20×20 | `Topbar.tsx:368` |
| Badges de puertos | 16 px de alto | `QuickActionsBar.tsx:186-210` (`h-4`) |
| "Cerrar" alerta | 24 px | `AlertsPanel.tsx:256` |
| Copiar/limpiar consola | 28 px | `LivePingConsole.tsx:227-261` |

Los cinco botones de copiado son el gesto más repetido del operador (pasa IP/MAC al ticket) y son los más chicos de la app. **Fix:** `size="icon-xs"` (24 px) con `hitSlop` visual vía padding, o convertir la fila en "valor + ícono 24 px" alineado a la derecha. Para copiar, `Tooltip` con "Copiar IP", no solo `title` nativo.

### P1-4 · La selección de teclado en el dropdown es invisible (y hay una clase inválida)

**Evidencia:** `Topbar.tsx:299-303`

```tsx
isSelected ? "text-accent-foreground bg:text-inherit dark:bg-muted/80" : "hover:bg-accent/10"
```

- `bg:text-inherit` **no compila a nada**: `bg:` no es una variante de Tailwind y `text-inherit` no es una utilidad de fondo. Es un typo que produce una clase muerta.
- Resultado: con flechas, la única señal es el color del texto (`text-primary`) y el ícono. No hay fondo de fila, no hay `aria-selected`, no hay `role="option"`. En un monitor corporativo con brillo bajo, el operador no sabe dónde está parado.

**Fix:** `data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground` y `aria-selected`. Se resuelve solo al migrar a `Command` (P0-1).

### P1-5 · La tipografía mono no es determinista

**Evidencia:** `index.css:13`

```css
--font-mono: var(--font-mono, "Geist Mono", ui-monospace, ...);
```

- El token **se referencia a sí mismo** y queda inválido en tiempo de cómputo; el CSS compilado lo confirma (`dist/assets/index-*.css`: `--font-mono:var(--font-mono,"Geist Mono",…)`), y además la regla posterior `code, pre, .font-mono { font-family: var(--font-mono) }` (`index.css:133-135`) pisa la utilidad.
- **Geist Mono no está instalado:** `package.json` solo trae `@fontsource-variable/geist` y `roboto-slab`.
- Consecuencia: IP, MAC, hostname y logs caen a `Consolas` en Windows, o al sans heredado según qué regla gane. En una app donde el operador distingue `0/O` y `1/l/I` todo el día, esto importa.

**Fix:** `@import "@fontsource-variable/geist-mono"` + `--font-mono: "Geist Mono Variable", ui-monospace, Consolas, monospace;` (sin `var()` propio) y borrar la regla duplicada. Alternativa zero-cost: aceptar `Consolas` y fijarlo explícito en el token.

### P1-6 · Feedback duplicado y ausente a la vez

- `actionFeedback` se calcula en `App.tsx:59` y se pasa en `App.tsx:405`, pero **`QuickActionsBar` nunca lo renderiza**: solo se desestructura (`QuickActionsBar.tsx:58`). El feedback inline que pedía la spec (`compact_ui_redesign`, §2.4) no existe.
- En su lugar, cada acción dispara un `toast` genérico: `handleAction()` en `QuickActionsBar.tsx:94-97` emite "Acción disparada: …" **y** `App` emite otro toast de éxito/error (`App.tsx:308-324`). Dos notificaciones por un clic, una de ellas redundante.
- Además todos los avisos son `toast` de esquina: el operador que mira la ficha no ve el resultado.

**Fix:** mostrar el feedback en una línea fija dentro de la barra (altura reservada, sin CLS), con `Alert` compacto o un `div role="status" aria-live="polite"`; eliminar el toast de "acción disparada" y dejar toast solo para errores que requieren acción (con botón "Usar MSRA", que ya está implementado en `App.tsx:338-345`).

---

## 6. P2 — Sistema, consistencia y deuda

| ID | Hallazgo | Evidencia | Fix |
|---|---|---|---|
| P2-1 | **Jerarquía plana:** 4 cards del mismo peso; "Ubicación" y "Usuario NT" (lo primero que pregunta el operador) están en la 4.ª, al final | `TerminalTechnicalCard.tsx:32,245-306` | Una sola card con 4 secciones y orden Red → AD/Sede → SO → Hardware; identidad y sede arriba (§9) |
| P2-2 | **Tablas a mano:** Alertas y Reseteos son `<table>` propios; la fila se expande con `onClick` en `<tr>`, sin teclado ni `aria-expanded` | `AlertsPanel.tsx:201-206`, `ResetUptimePanel.tsx:106` | `Table` de shadcn + fila con botón chevron real (como ya hace la columna Acción) |
| P2-3 | **Sin maximizar:** `maximizable:false` y tope 1200×800, pero existe `maximizeWindow()` en el service sin UI | `electron/main.cjs:135-138`, `electronClient.ts:236` | Decisión de producto: o se habilita, o se asume 1020×680 y se diseña para eso (recomendado: lo segundo) |
| P2-4 | **Acciones con el mismo peso:** 6 controles `h-8`; el uptime se trunca a 100 px en el extremo derecho | `QuickActionsBar.tsx:140-439` | CTA primaria + 1 overflow "Más"; uptime como chip de estado junto a la identidad |
| P2-5 | **Código muerto que los tests sostienen:** `HardwareCard`, `NetworkAdCard` y `Sidebar` no se usan en la app; solo los renderizan tests | `CardsContrastCopy.test.tsx`, `Sidebar.test.tsx`, `ShadcnPreset.test.tsx:28-29` | Borrar y re-apuntar los tests a `TerminalTechnicalCard` |
| P2-6 | **"No encontrada" sin recuperación:** explica el motivo, pero no ofrece buscar similar, escanear subred ni abrir Portal MDA | `App.tsx:439-468` | Agregar 2 acciones (Escanear subred / Portal MDA) |
| P2-7 | **Radios inconsistentes:** `Card` es `rounded-xl`, la ficha fuerza `rounded-lg`, los badges `rounded-4xl` | `ui/card.tsx:14`, `TerminalTechnicalCard.tsx:36` | Un solo radio por nivel (card 8, control 6, chip 4) |
| P2-8 | **Encoding roto:** un byte CP1252 (`0xE1`) entre UTF-8 en el drawer; decodificado estricto falla | `SubnetScannerDrawer.tsx:92` | Guardar como UTF-8 sin BOM; agregar test de encoding de fuentes |
| P2-9 | **`animate-pulse` sobre texto/estado:** el botón Ping entero parpadea al pingear | `QuickActionsBar.tsx:279-283` | Punto de 6 px animado + texto estable |

---

## 7. Contraste medido (tokens reales, tema claro salvo indicación)

| Par | Uso en la app | Ratio | AA texto (4,5) | AA gráfico (3,0) |
|---|---|---:|---|---|
| `foreground` / `background` | texto base | 19,79:1 | Sí | Sí |
| `muted-foreground` / `card` | labels de ficha | 4,73:1 | Sí (al límite) | Sí |
| `muted-foreground` / `muted` | filas y chips | **4,34:1** | **No** | Sí |
| `muted-foreground/80` / `card` | drawer, subred | **3,23:1** | **No** | Sí |
| `primary` / `card` | links "Portal MDA" | 6,82:1 | Sí | Sí |
| `primary-foreground` / `primary` | CTA VNC | 6,26:1 | Sí | Sí |
| `destructive` / `card` | texto de error | 4,76:1 | Sí | Sí |
| `destructive` / `destructive/10` | botón "Detener" | **3,99:1** | **No** | Sí |
| `amber-600` / `amber-500/15` | badge "Activa" | **2,84:1** | **No** | **No** |
| `emerald-600` / `emerald-500/15` | badge "Cerrada" | **3,27:1** | **No** | Sí |
| `emerald-500` / `emerald-500/10` | badge de reseteo | **2,31:1** | **No** | **No** |
| `emerald-500` / `card` | ícono "online", check de copiado | **2,54:1** | **No** | **No** |
| `border` / `card` | borde de inputs y cards | **1,26:1** | — | **No** |
| `muted-foreground` (dark) / `card` | labels en oscuro | 6,91:1 | Sí | Sí |
| `emerald-500` (dark) / `card` | estado en oscuro | 7,06:1 | Sí | Sí |

**Lectura:** el tema oscuro está sano salvo el borde de control (1,32:1); el claro falla en 8 pares, y los 4 peores son justamente estados operativos (activa/cerrada/online/reseteo). No es un problema de paleta completa: son 3 decisiones puntuales (`muted-foreground`, `destructive`, y los pares `*-600` sobre tinte `/15`).

Medición reproducible: `node scripts/check-contrast.mjs` (lee los tokens reales de `src/index.css`, convierte OKLCH → sRGB y devuelve exit code 1 si un texto baja de 4,5:1).

---

## 8. Densidad y objetivos táctiles

| Elemento | Actual | Propuesta | Motivo |
|---|---|---|---|
| Label de campo | 10 px uppercase, `tracking-wider` | 11 px normal | Se escanea por forma, no por mayúsculas |
| Valor técnico | 12 px | 13 px mono `tabular-nums` | IP/MAC/fechas se comparan por columna |
| Fila de ficha | ~33 px | 28 px | Alinea label/valor en 2 columnas |
| Botón primario | 32 px | 32 px | Ya está bien |
| Botón de fila | 24–28 px | 28–32 px | WCAG 2.5.8 |
| Copiar | 14 px | 24 px | Es el gesto más usado |
| Card padding | 10 px | 12 px | Aire sin perder densidad |
| Gap de sección | 16 px | 12 px | Recupera 12–16 px |

---

## 9. Orden de la información: antes / después

**Hoy (al buscar una terminal):** acciones → 4 cards iguales → consola → reseteos → alertas. El operador ve primero *qué puede hacer*, después *de quién es la máquina*, y nunca ve las alertas.

**Propuesta (D1):**

```
┌ Topbar 48 ────────────────────────────────────────────────────────┐
│ Logo   [ Buscar terminal o IP ……………………… ]   SQL ●      ⚙  ▁ ⏻   │
├───────────────────────────────────────────────────────────────────┤
│ PC-CORREO-042        ● En línea        192.0.2.101  [copiar]     │  identidad 64
│ Sede Centro · Usuario NT jperez · Últ. relevamiento 12/09        │
├───────────────────────────────────────────────────────────────────┤
│ [Conectar VNC  F2] [MSRA F3] [Ping F4] [-t] [Diag ▾]     4d 02h  │  acciones 40
├───────────────────────────────────────────────────────────────────┤
│ Ping 14 ms · Pérdida 0 % · Uptime 4d 2h · AV 12.4 · IE 11        │  salud 32
├───────────────────────────────────────────────────────────────────┤
│ RED             │ SISTEMA        │ HARDWARE       │ AD & SEDE     │
│ Hostname …      │ Windows 10     │ i5-8500        │ jperez        │  detalle 220
│ IP / MAC …      │ Build 19045    │ 8 GB RAM       │ Sede Centro   │
├───────────────────────────────────────────────────────────────────┤
│ ▸ Consola de diagnóstico · último ping 14:32 · 4/4 · 14 ms       │  32 colapsada
├───────────────────────────────────────────────────────────────────┤
│ Alertas (2)                                        [+ Nueva]     │
│ ● Activa   Disco lleno en C:   jperez   12/09  [Cerrar]          │  120
└───────────────────────────────────────────────────────────────────┘
```

Cálculo: 48 + 64 + 40 + 32 + 220 + 32 + 120 + paddings ≈ **576 px** → entra completo en 680, con Alertas visible. La consola sigue a un clic.

Regla de lectura: **una sola línea de identidad** (hostname grande, IP mono, estado), **una franja de salud** de 5 chips, y **una grilla alineada** de 4 columnas × 3 filas como máximo. Nada de 4 cards con 2 datos cada una.

---

## 10. Inventario shadcn

**Instalado (11):** `button`, `card`, `input`, `label`, `separator`, `textarea`, `alert`, `badge`, `kbd`, `dialog`, `sonner`.
**Bien:** tokens OKLCH, `data-slot`, `components.json` correcto (`style: default`, `iconLibrary: lucide`), `lib/utils` reexporta `cn`.
**Desvío menor:** las primitivas importan `cn` desde el paquete `"cn"` en vez de `@/lib/utils`; lo que genere el CLI usará `@/lib/utils`. Conviene unificar para que el próximo `shadcn add` no mezcle convenciones.

**Faltantes con impacto directo:**

| Componente | Reemplaza a | Dónde |
|---|---|---|
| `command` | dropdown de historial a mano | `Topbar.tsx:274-378` |
| `table` | 2 tablas propias | `AlertsPanel.tsx:188`, `ResetUptimePanel.tsx:106` |
| `collapsible` | consola fija de 291 px | `LivePingConsole.tsx` |
| `tooltip` | `title` nativo en valores truncados | ficha, uptime, puertos |
| `scroll-area` | scrollbars mixtos | consola y dropdown |
| `skeleton` | spinner centrado | `App.tsx:432-438` |
| `sheet` | drawer propio | `SubnetScannerDrawer.tsx` |
| `context-menu` | menú propio | `OperatorContextMenu.tsx` |
| `alert-dialog` | cierre de alerta sin confirmación | `AlertsPanel.tsx:247` |
| `tabs` | secciones apiladas | ficha / consola / alertas |

```bash
npx shadcn add command table collapsible tooltip scroll-area skeleton sheet context-menu alert-dialog tabs
```

---

## 11. Plan de ejecución

| Fase | Contenido | Esfuerzo | Criterio de aceptación |
|---|---|---:|---|
| **0 · Contrato y tokens** | `scripts/check-contrast.mjs` + `node scripts/check-contrast.mjs` dentro de `release:check`; subir `muted-foreground`, corregir `destructive` y `input`, arreglar `--font-mono`; `design-contract.test.ts` con patrones prohibidos (`text-[9px]`, `text-[10px]`, `h-3.5 w-3.5 p-0`, `bg:`) | 3 h | 0 pares AA en falla; `check-contrast` exit 0; build verde |
| **1 · P0** | Buscador `Command` con catálogo real; contexto solo fuera de editables + quitar `select-none`; consola colapsable | 1 d | Escribir 3 letras muestra coincidencias reales; clic derecho en el buscador permite pegar; Alertas visible sin scroll en 1020×680 |
| **2 · Ficha y densidad** | Identidad + franja de salud + grilla única; escala 18/14/12/11; targets 24 px; `Table` + teclado en alertas | 1 d | Sin texto < 12 px salvo overline; todo control ≥ 24 px; hostname, IP, sede y usuario en la primera línea |
| **3 · Pulido** | Tooltips, skeletons, empty states, feedback inline (eliminar toast duplicado), borrar código muerto, encoding | 0,5 d | 1 solo feedback por acción; `HardwareCard`/`NetworkAdCard`/`Sidebar` fuera del repo |

**Métricas de éxito (antes → después):**

| Métrica | Hoy | Objetivo |
|---|---:|---:|
| Textos < 12 px | 90 | ≤ 10 (solo overline) |
| Pares de contraste AA en falla (claro) | 8 | 0 |
| Controles clicables < 24 px | 6 | 0 |
| Alertas visibles en primer pantalla | No | Sí |
| Tiempo de "escribo 3 letras → veo identidad" | requiere Enter ciego | ≤ 150 ms |
| Toasts por acción | 2 | 0 (inline) / 1 (error) |

---

## 12. Verificación propuesta

1. **Test de contraste en CI:** `scripts/check-contrast.mjs` lee los tokens de `index.css`, falla si un par baja de 4,5:1 (texto) y reporta los bordes bajo 3:1. Sin dependencias nuevas. Hoy devuelve exit 1: ese es el baseline a corregir en la fase 0.
2. **Test de contrato de diseño:** el repo ya usa tests que leen archivos (`ShadcnPreset.test.tsx:36-50`); extender ese patrón a patrones prohibidos y a tamaños mínimos.
3. **Test de accesibilidad del buscador:** `role="combobox"` + `aria-activedescendant` + flechas/Enter.
4. **Captura visual:** agregar Playwright solo para 1020×680 y 900×600, con umbral de píxeles en la ficha; hoy no hay forma de detectar regresiones de layout.

---

## Anexo · Evidencia usada

`App.tsx:59,383-387,400-422,439-468,470-484,491-502` · `Topbar.tsx:126-132,236-254,274-378,299-303,330-372,384-489` · `TerminalTechnicalCard.tsx:32,38,50-64,245-306,310` · `QuickActionsBar.tsx:14-58,94-97,140-439` · `LivePingConsole.tsx:194,206-268,277` · `AlertsPanel.tsx:188-222,240,247-256` · `ResetUptimePanel.tsx:106-124` · `OperatorContextMenu.tsx:42-75` · `ui/kbd.tsx:11` · `ui/card.tsx:14` · `ui/button.tsx:11-19` · `index.css:13,66,69-72,133-135` · `electron/main.cjs:131-139` · `package.json:17-18` · `dist/assets/index-PFCgwBpJ.css` (token compilado).
