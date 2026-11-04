# Revertir tooltips y limpiar el historial de búsquedas · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eliminar la capa de tooltips (`Hint`) introducida en Fase 3 y volver al `title` nativo en los controles, y simplificar las filas del historial de búsquedas (sin etiqueta de tipo, sin animación de entrada).

**Architecture:** dos cambios acotados sobre lo ya mergeado: (1) se borra `src/components/Hint.tsx` y su test y cada uno de sus 31 usos vuelve a `title=` conservando el `aria-label`; (2) en `Topbar.tsx` se quita la etiqueta «equipo/cuenta» dejando el icono, y se anula la animación de entrada del `PopoverContent` del buscador. `TooltipProvider` y `ui/tooltip.tsx` quedan instalados pero sin consumidores; no se toca ninguna otra primitiva.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · `radix-ui@1.8.1` · Vitest 3 + Testing Library · Electron 34.

**Prerrequisito:** `main` en `8e00683`. Estado medido: 394 tests en 65 archivos, build verde, `--strict` exit 0, ratchet **0/0/0/1**.

**Fuera de alcance:** deshacer el resto de Fase 3 (buscador `Command`, `ContextMenu`, `Sheet`, `AlertDialog`, `Switch`/`ToggleGroup`/`Progress`, `eject`) · los `title` de `Sidebar`/`HardwareCard`/`NetworkAdCard` (deuda de Fase 4) · cualquier cambio de tokens, tipografía o densidad.

---

## Estado de partida (medido)

| Hecho | Valor | Evidencia |
|---|---|---|
| Usos de `Hint` | **31** en 7 archivos | `LivePingConsole` 4 · `QuickActionsBar` 11 · `SubnetScannerDrawer` 6 · `Topbar` 7 · `CopyValueButton` 1 · `ThemeToggle` 1 · `TerminalIdentity` 1 |
| Etiqueta de tipo en el historial | `«cuenta»`/`«equipo»` en un `<span>` | `Topbar.tsx:406-408` |
| Animación de entrada del panel | `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95` | `src/components/ui/popover.tsx` (base) |
| Proveedor de tooltips | montado en `main.tsx`, sin consumidores tras el cambio | `src/main.tsx` |

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar limpio y crear rama**

```bash
git status --porcelain
git switch -c fix/revertir-tooltips
```

Expected: sólo `M electron/main.cjs` (ajeno; no se toca). La rama nace de `8e00683`.

- [ ] **Step 2: Anotar el punto de partida**

```bash
npx vitest run
npm run build
node scripts/check-contrast.mjs --strict
```

Expected: **394** tests · build verde · `--strict` exit 0 con `Texto: 0 · UI: 3 · Tokens ausentes: 0`.

---

### Task 1: Borrar `Hint` y restaurar `title` nativo

**Files:**
- Delete: `src/components/Hint.tsx`, `src/test/Hint.test.tsx`
- Modify: `src/components/LivePingConsole.tsx`, `src/components/QuickActionsBar.tsx`, `src/components/SubnetScannerDrawer.tsx`, `src/components/Topbar.tsx`, `src/components/CopyValueButton.tsx`, `src/components/ThemeToggle.tsx`, `src/components/TerminalIdentity.tsx`, `src/components/TerminalIdentity.test.tsx`
- Modify: `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md`

El `Hint` envolvía el control con `TooltipTrigger asChild`. El rollback **no** es simétrico: cada control recupera el `title` con el mismo texto que tenía el `label`, y conserva su `aria-label` (el nombre accesible nunca dependió del tooltip).

- [ ] **Step 1: Borrar el componente y su test**

```bash
git rm src/components/Hint.tsx src/test/Hint.test.tsx
```

- [ ] **Step 2: Restaurar `title` en cada uso**

Patrón exacto:

```tsx
// Antes
<Hint label="Copiar logs completos al portapapeles">
  <Button … aria-label="Copiar logs de ping">…</Button>
</Hint>

// Después
<Button … aria-label="Copiar logs de ping" title="Copiar logs completos al portapapeles">…</Button>
```

Tabla de restauración (archivo → cantidad → `title`/`label` a mover):

| Archivo | Usos | `title` a restaurar |
|---|---|---|
| `LivePingConsole.tsx` | 4 | `Volver a ejecutar net user` · `Limpiar pantalla de logs` · `Copiar únicamente el último comando y su respuesta al portapapeles` · `Copiar logs completos al portapapeles` |
| `QuickActionsBar.tsx` | 11 | `Conectar automáticamente según puertos disponibles (Atajo F2)` · `Opciones manuales y estado de puertos` · `Iniciar Ping estándar (4 paquetes) (Atajo F4)` · `Ejecutar Ping infinito / continuo (-t)` · `Más acciones` · `Escanear toda la subred de esta terminal` · `Refrescar tiempo de actividad` · los cuatro site-ping interpolados (`Ping estándar (4 paquetes) a ${…}` y `Ping continuo (-t) a ${…}` con `routerIp`/`serverIp`) |
| `SubnetScannerDrawer.tsx` | 6 | `Conexión remota rápida (VNC / MSRA)` · `Pausar escaneo de subred` · `Reiniciar escaneo desde el inicio` · `Reanudar escaneo de subred` · `Volver a escanear toda la subred` · el botón de host recupera `Consultar terminal ${displayName}` |
| `Topbar.tsx` | 7 | `Lanzar VNC Viewer a ${item.value}` · `Quitar del historial` · `Ir a Portal MDA (Inventario de Terminales en la red corporativa)` · `Configuración y Actualizaciones (Atajo F10)` · `Información y características del aplicativo` · `Minimizar a barra de tareas` · `Ocultar en bandeja del sistema (Turn Off)` |
| `CopyValueButton.tsx` | 1 | el `aria-label` de la prop `label` se replica en `title` (`title={label}`) |
| `ThemeToggle.tsx` | 1 | `theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'` |
| `TerminalIdentity.tsx` | 1 | el motivo deshabilitado vuelve a `title`: `validUsers.length === 0 ? "El usuario NT contiene caracteres no permitidos" : "Consultar cuenta AD"`; el `aria-label` vuelve a ser fijo `"Consultar cuenta AD"` |

Reglas:
- Los `title` van **después** de `aria-label` en la misma etiqueta del control, para que el diff sea legible.
- Se eliminan los imports `Hint` y las líneas `<Hint …>`/`</Hint>`; los condicionales (`siteTargets.isValid`, `onRerun`, estados del escaneo) quedan igual.
- No se agregan wrappers, `div` ni `span`: el control debe ser el mismo elemento que antes.

- [ ] **Step 3: Revertir el test de `TerminalIdentity`**

En `src/components/TerminalIdentity.test.tsx`, el caso "deshabilita" vuelve al nombre accesible fijo:

```tsx
expect(
  screen.getByRole("button", { name: "Consultar cuenta AD" }),
).toBeDisabled();
```

- [ ] **Step 4: Verificar que no queda ningún uso de `Hint` ni tooltip**

```powershell
Select-String -Path src\App.tsx,src\components\*.tsx -Pattern '<Hint|from "\./Hint"|TooltipTrigger|TooltipContent' | Where-Object { $_.Filename -notmatch 'test' -and $_.Path -notmatch '\\ui\\' }
```

Expected: sin resultados (fuera de `src/components/ui/tooltip.tsx`).

- [ ] **Step 5: Verde**

```bash
npx vitest run src/components/TerminalIdentity.test.tsx src/test/NetUserFlow.test.tsx src/test/QuickActionsBar.test.tsx src/test/LivePingConsole.test.tsx src/test/SubnetScannerDrawer.test.tsx src/test/AppTerminalLayout.test.tsx
npm test
```

Expected: verde (el total baja en 2 por el test borrado).

---

### Task 2: Historial de búsquedas sin etiqueta de tipo y sin animación

**Files:**
- Modify: `src/components/Topbar.tsx` (fila de resultados y `PopoverContent`)
- Test: `src/test/TopbarSearchNavigation.test.tsx`

Decisiones del dueño del producto: se quita **sólo** la etiqueta «cuenta»/«equipo»; el icono de tipo se conserva. La animación de entrada del panel se anula; la de salida queda como está.

- [ ] **Step 1: Test que falla**

```tsx
it("no distingue el tipo con texto y no anima la entrada del panel", async () => {
  render(<Topbar onSelectTerminal={vi.fn()} onSelectAccount={vi.fn()} />);

  const input = screen.getByRole("combobox", { name: /buscar terminal/i });
  fireEvent.focus(input);
  fireEvent.click(input);

  const listbox = await screen.findByRole("listbox");
  expect(within(listbox).queryByText(/^cuenta$/i)).toBeNull();
  expect(within(listbox).queryByText(/^equipo$/i)).toBeNull();

  const options = within(listbox).getAllByRole("option");
  expect(options[0].querySelector("svg")).not.toBeNull();

  const panel = screen.getByRole("dialog", { name: /resultados de búsqueda/i });
  expect(panel.className).toContain("data-open:animate-none");
  expect(panel.className).not.toContain("data-open:animate-in");
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/TopbarSearchNavigation.test.tsx -t "no distingue"`
Expected: FAIL — hoy hay «equipo»/«cuenta» y el panel trae `data-open:animate-in`.

- [ ] **Step 3: Quitar la etiqueta y conservar el icono**

En el `CommandItem` de cada fila, borrar únicamente el `<span>` del tipo:

```tsx
// Antes
<span className="truncate font-mono text-xs font-semibold">
  {item.value}
</span>
<span className="ml-auto text-[10px] text-muted-foreground">
  {isAccount ? "cuenta" : "equipo"}
</span>

// Después
<span className="truncate font-mono text-xs font-semibold">
  {item.value}
</span>
```

El `isAccount` sigue usándose para elegir el icono (`UserRound`/`Monitor`) y para la acción de VNC.

- [ ] **Step 4: Anular la animación de entrada del panel**

En el `PopoverContent` del buscador, agregar la negación con la misma variante que trae la primitiva:

```tsx
<PopoverContent
  align="start"
  sideOffset={4}
  aria-label="Resultados de búsqueda"
  className="w-[var(--radix-popover-trigger-width)] p-0 data-open:animate-none"
  onOpenAutoFocus={(event) => event.preventDefault()}
  onPointerDownOutside={…}
>
```

`tailwind-merge` resuelve `data-open:animate-in` contra `data-open:animate-none` a favor de la clase del consumidor; `data-open:fade-in-0` y `zoom-in-95` quedan inertes sin `animate-in`. No se toca `popover.tsx` ni la animación de cierre.

- [ ] **Step 5: Verde**

```bash
npx vitest run src/test/TopbarSearchNavigation.test.tsx src/components/Topbar.test.tsx src/test/AppTerminalLayout.test.tsx
npm test
```

Expected: verde. Adaptar cualquier aserción que dependiera del texto «equipo»/«cuenta» (reescribir, no borrar).

---

### Task 3: Documentar la reversión y cerrar

**Files:**
- Modify: `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md`

- [ ] **Step 1: Reemplazar la sección «Ayuda contextual» de `DESIGN.md`**

```markdown
## Ayuda contextual

Los controles interactivos usan `title` nativo. El `aria-label` es el nombre
accesible y el `title` sólo agrega una frase de ayuda que el navegador muestra
sin capas, sin animación y sin bloquear el puntero.

Se probó una capa de tooltips (`Hint` sobre Radix `Tooltip`) y se descartó: no
reemplazaba al `aria-label`, pero agregaba animación y ruido a controles que no
la necesitan, y el contenido flotante interfería con el clic en otras secciones.

`TooltipProvider` y `src/components/ui/tooltip.tsx` siguen instalados pero **sin
consumidores**; no se usa ningún tooltip en la aplicación.

Los `title` de superficies informativas (chip de uptime, badge de conexión) se
conservan. Deuda declarada: `Sidebar`, `HardwareCard` y `NetworkAdCard` todavía
tienen `title` interactivos y se migran o se borran en Fase 4.
```

Y en la sección «Overlays y controles», ajustar la mención del buscador para que diga que las filas muestran sólo el valor (sin etiqueta de tipo) y que el panel no tiene animación de entrada.

- [ ] **Step 2: Registrar la reversión en el audit**

Reemplazar en la línea de estado de Fase 3 la frase «30 `title=` → `Hint` (Tooltip)» por:

```markdown
> **Reversión (2026-11-04):** los tooltips (`Hint`) se descartaron y los controles
> volvieron al `title` nativo; el historial de búsquedas ya no etiqueta el tipo de
> resultado (conserva el icono) y su panel no anima la entrada.
```

- [ ] **Step 3: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
node scripts/check-contrast.mjs --strict
npx vitest run src/test/designContract.test.ts
```

Expected: suite verde (394 − 2 tests de `Hint` + 1 nuevo = **393**) · build verde · ambos contrastes exit 0 · ratchet **0/0/0/1** sin cambios.

- [ ] **Step 4: Commit**

```bash
git add src/components/Hint.tsx src/test/Hint.test.tsx src/components/LivePingConsole.tsx src/components/QuickActionsBar.tsx src/components/SubnetScannerDrawer.tsx src/components/Topbar.tsx src/components/CopyValueButton.tsx src/components/ThemeToggle.tsx src/components/TerminalIdentity.tsx src/components/TerminalIdentity.test.tsx src/test/TopbarSearchNavigation.test.tsx DESIGN.md docs/ui-slop-audit-2026-11-02.md
git commit -m "revert(ui): title nativo en lugar de tooltips y historial sin tipo"
```

---

## Criterios de aceptación

- [ ] Cero usos de `Hint`/`TooltipTrigger`/`TooltipContent` en componentes de app.
- [ ] Los 31 controles conservan su `aria-label` y recuperan su `title`.
- [ ] El historial no muestra «equipo»/«cuenta» y sí el icono de tipo.
- [ ] El panel de resultados no tiene animación de entrada (`data-open:animate-none`, sin `data-open:animate-in`).
- [ ] `npm test`, `npm run build`, `npm run audit:contrast` y `--strict` en verde; ratchet 0/0/0/1.

## Hand-offs

| Pendiente | Por qué |
|---|---|
| `title` interactivos en `Sidebar`/`HardwareCard`/`NetworkAdCard` | Fase 4 |
| `TooltipProvider` sin consumidores | Decidir en Fase 4 si se elimina junto con `ui/tooltip` |
| Menú contextual: `aria-label` propio y test de flechas | Deuda detectada en la review de Fase 3 |
| Reset del `activeValue` al borrar la fila activa | Deuda detectada en la review de Fase 3 |
