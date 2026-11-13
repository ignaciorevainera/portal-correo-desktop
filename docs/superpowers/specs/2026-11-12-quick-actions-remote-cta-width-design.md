# Design: Prioridad de ancho para el CTA de conexión remota (QuickActionsBar)

- **Fecha:** 2026-11-12
- **Estado:** Aprobado (Sección 1 y Sección 2 del brainstorming)
- **Archivos afectados:**
  - `src/components/QuickActionsBar.tsx` (cambio de clases + comentarios)
  - `src/test/QuickActionsBar.test.tsx` (actualización de asserts)
  - `e2e/specs/11-quick-actions-remote-cta.spec.ts` (spec nuevo)

## 1. Contexto

La barra de acciones rápidas es 100 % fluida: `flex-wrap` + anchos mínimos, sin
breakpoints salvo `md` (768px) para mostrar los chips `Kbd` (F2/F4). El CTA de
conexión remota (`src/components/QuickActionsBar.tsx:153-156`) es un split button
con `min-w-[170px] flex-1 grow` y su label usa `truncate`:

- **Pantalla ancha:** se estira y reparte el sobrante con Ping/`.250`/`.231`/Uptime.
- **Pantalla angosta:** el piso de 170px no alcanza para todos los labels
  ("Conectar VNC :5901" + chip F2 ≈ 185px; "Sin Acceso (Reintentar)" ≈ 190px)
  → **el texto se corta**.

## 2. Objetivo

Priorizar el CTA de conexión remota para que ocupe **el ancho mínimo necesario
para mostrar su texto completo**: nunca truncado, sin estirarse con el
sobrante, y siempre en la primera fila cuando la barra hace wrap.

### No-objetivos

- No se modifica el orden de wrap ni el crecimiento (`flex-1 grow`) de los demás CTAs.
- No se agregan breakpoints ni se reintroducen clases `order-*`.
- No se cambia el orden de tabulación/foco (sigue siendo el orden de DOM).

## 3. Diseño

### 3.1 Cambio en el componente (Sección 1, aprobada)

Wrapper del split remoto (`src/components/QuickActionsBar.tsx:153-156`):

```diff
 <div
-  className="relative flex items-center min-w-[170px] flex-1 grow"
+  className="relative flex items-center min-w-max"
   ref={dropdownRef}
 >
```

- Se conservan `relative` y el `ref={dropdownRef}` (posicionamiento del menú desplegable).
- Comentario `src/components/QuickActionsBar.tsx:152` *"(… ) con grow"* →
  *"Split Button Inteligente de Conexión Remota: ancho al contenido (min-w-max), sin crecer"*.
- Comentario obsoleto `src/components/QuickActionsBar.tsx:148-150` (menciona clases
  `order` eliminadas en el commit `30e14d4`) → reescrito para describir el comportamiento real:
  el CTA remoto va primero y a ancho de contenido; el resto se acomoda con `flex-wrap`.
- **No se toca** el label interno: el span conserva `truncate` como válvula de seguridad,
  y el botón principal interno conserva `flex-1 min-w-0` (rellena el wrapper junto al chevron).
- Ningún otro CTA cambia.

**Efecto:** el ancho del CTA = icono + label + chip `F2` (solo ≥768px) + chevron.
Nunca se corta el texto, no se estira con el sobrante y, al ser el primer hijo del
`flex-wrap`, siempre llega primero a la fila 1 (los demás hacen wrap a su alrededor).
El umbral de quiebre de la barra se corre ~15-30px a la derecha (piso fijo de
170px → ancho real del contenido).

### 3.2 Tests unitarios (Sección 1, aprobada)

`src/test/QuickActionsBar.test.tsx:462-468`:

```diff
 const remote = screen.getByRole("button", { name: /conexión remota inteligente/i });
-expect(remote.closest("div.relative")?.className).toContain("flex-1");
-expect(remote.closest("div.relative")?.className).toContain("grow");
+expect(remote.closest("div.relative")?.className).toContain("min-w-max");
+expect(remote.closest("div.relative")?.className).not.toContain("flex-1");
+expect(remote.closest("div.relative")?.className).not.toContain("grow");
```

- Sin cambios en los asserts de Ping, `.250`/`.231`, Uptime (`flex-1 grow`) ni de
  `contents`/`flex-wrap` (`src/test/QuickActionsBar.test.tsx:470-519`).

### 3.3 E2E con viewport (Sección 2, aprobada)

Spec nuevo: **`e2e/specs/11-quick-actions-remote-cta.spec.ts`** (el `10-` está ocupado
por `e2e/specs/10-responsive-toast.spec.ts`). Reproduce el patrón existente: Chromium
headless + `setupElectronMock` + `navigateToMainWindow` + `MainWindowPOM.searchTerminal()`
(`e2e/fixtures/testHelper.ts`, `e2e/pom/MainWindowPOM.ts`) y cambia el ancho con
**`page.setViewportSize()`** — los e2e corren en Chromium sobre `dist/index.html`,
no hay ventana nativa que redimensionar.

**Tres anchos de prueba:**

| Ancho | Qué valida |
|---|---|
| `1440` | Barra en una fila, chip `F2` visible (≥ md) |
| `1024` | **No se estira**: ancho del CTA idéntico al de 1440 (±1px) |
| `420` | Ancho mínimo real de la app (`electron/main.cjs` → `minWidth: 420`, citado en `e2e/specs/10-responsive-toast.spec.ts:11`): CTA en la primera fila, etiqueta completa, dentro del viewport |

**Aserciones en cada ancho:**

1. *Sin truncado*: todo `span.truncate` del botón cumple `scrollWidth <= clientWidth + 1`,
   más un guard anti-vacío `truncateCount > 0` (si un refactor eliminara la clase
   `truncate`, la aserción falla en vez de pasar en vacío).
2. *Sin estiramiento*: `width(1440) ≈ width(1024)` (±1px; mismo lado del breakpoint `md`
   donde aparece el chip `F2`).
3. *Prioridad de fila*: la `y` del CTA remoto es la primera entre los CTAs de la barra.
4. *Sin desborde*: `left >= 0 && right <= window.innerWidth`.

**Estabilidad de medición:** antes de medir, esperar a que el label esté en su estado
estable (`Conectar VNC :5901`), porque la barra puede arrancar con el probe de acceso
remoto en curso.

**Prerequisito:** `dist/` compilado (`npm run build`) antes de `npm run test:e2e`,
igual que hoy en `release:check`.

## 4. Criterios de aceptación

- `npm test` en verde (unit tests actualizados).
- `npm run build && npm run test:e2e` en verde (spec 11 incluido).
- Ventana ancha: el CTA mide exactamente el ancho de su contenido y el sobrante
  queda repartido en Ping/`.250`/`.231`/Uptime (como hoy).
- Ventana angosta (hasta 420px): el label del CTA nunca aparece cortado y el CTA
  permanece en la primera fila de la barra.

## 5. Riesgos y casos límite

- **Salto de ancho al cruzar md (768px):** el chip `F2` suma ~30px al ancho del CTA.
  Es esperado (hay que dejarle lugar) y solo afecta el lado ≥ md.
- **Labels cortos por debajo de 170px** (p. ej. "Conectar MSRA" ≈ 145px sin chip):
  el CTA queda más angosto que hoy. Aceptado: el requisito es el ancho mínimo
  necesario para el texto (Enfoque 1, aprobado por el usuario).
- **Ventana < ancho del label** (~200px, muy por debajo del `minWidth: 420` de la app):
  el contenido desbordaría y se recortaría en el contenedor `overflow-hidden` de la app.
  Fuera de alcance; con `min-w-max` el wrapper no puede encoger, así que el `truncate`
  del label ya no llega a activarse.
- **Mediciones e2e sensibles al estado del probe:** resolver esperando el label estable
  antes de medir.

## 6. Verificación

```bash
npm test
npm run build
npm run test:e2e
```

Verificación manual: abrir la app, seleccionar una terminal y redimensionar la
ventana entre ~420px y el ancho de pantalla completo observando que el CTA de
conexión remota conserva siempre su label completo y no crece con el sobrante.
