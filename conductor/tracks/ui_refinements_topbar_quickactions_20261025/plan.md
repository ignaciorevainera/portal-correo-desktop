# Implementation Plan: UI/UX Refinements, QuickActionsBar Minimalista, Topbar Expandida y Estado Inicial Limpio

### Phase 1: Estado Inicial Limpio, Zero-Preload y Gestión de Scroll [checkpoint: b6b53db]
- [x] Task: Escribir tests para el estado inicial de la app sin terminal seleccionada (no ping, no QuickActionsBar, placeholder limpio sin botones demo de muestra) y scroll al tope en búsqueda [3f287dc]
- [x] Task: Modificar `App.tsx` para inicializar `selectedPc` y `terminal` en vacío, asegurando que no se dispare ping al inicio y que el contenedor `<main>` haga reset de scroll (`scrollTop = 0`) al cargar una terminal [b6b53db]
- [x] Task: Reemplazar el mensaje vacío en `<main>` con un componente minimalista y limpio indicando buscar una terminal en la barra superior (sin botones ni listas residuales de demo) [b6b53db]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b6b53db]

### Phase 2: Rediseño Minimalista de QuickActionsBar y Corrección de Alertas/Badges [checkpoint: ddf0baf]
- [x] Task: Escribir tests para `QuickActionsBar` sin contenedor `<Card>`, sólo con botones de acción y alineación precisa del badge/alert de feedback [3a5b478]
- [x] Task: Refactorizar `QuickActionsBar.tsx` eliminando el envoltorio `<Card>` y títulos, dejando exclusivamente los botones de acción (`VNC Viewer`, `Asistencia MSRA`, grupo `Ping`/`Ping -t`, y `Uptime`), corrigiendo la alineación flex de los iconos/emojis en los alerts [ddf0baf]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [ddf0baf]

### Phase 3: Aumento de Dimensiones de Topbar (h-14 / 56px) y Normalización de Acciones [checkpoint: f8c7b08]
- [x] Task: Escribir tests de layout e interacción para la barra superior ampliada y contraste del botón Portal MDA [9df59b3]
- [x] Task: Actualizar `Topbar.tsx` a altura `h-14` (56px), con input `h-10`, botones normalizados a `h-10` y estilos de alto contraste en modo claro/oscuro para el botón Portal MDA [f8c7b08]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [f8c7b08]

### Phase 4: Consolidación, Limpieza de Referencias Demo y Verificación Integral
- [ ] Task: Limpiar o estandarizar textos de prueba o demo restantes en componentes y tests asociados
- [ ] Task: Ejecución del suite de pruebas completo (`npm test`) y compilación limpia (`npm run build`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
