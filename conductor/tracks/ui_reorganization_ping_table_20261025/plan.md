# Implementation Plan: Reorganización Integral UI, Unificación Técnica, Consola Windows de Ping y Arrastre de Ventana

### Phase 1: Arrastre de Ventana en Header y Card Unificada Técnica (Hardware + Red)
- [ ] Task: Escribir tests para el área arrastrable del brand/logo en `Topbar` y para la nueva `TerminalTechnicalCard` unificada (conservando copiado de IP/MAC/CPU/UserNT)
- [ ] Task: Actualizar `Topbar.tsx` permitiendo que el logo y el nombre de la app formen parte de la región de arrastre (`app-drag-region`)
- [ ] Task: Crear el componente unificado `TerminalTechnicalCard.tsx` que combina Ficha Técnica, Sistema, Red, Ubicación y Active Directory en una sola card eficiente, sustituyendo las dos tarjetas separadas
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 2: Consola de Ping Estilo Terminal de Windows & Limpieza de Caracteres
- [ ] Task: Escribir tests para `LivePingConsole` validando la estética oscura inmutable `#0C0C0C`, scroll horizontal libre (`overflow-x-auto` / `whitespace-pre`) y sanitización de caracteres corruptos de Windows Ping
- [ ] Task: Implementar decodificación limpia y sanitización de salida de ping en `systemTools.cjs` y actualizar los estilos de `LivePingConsole.tsx` al diseño de consola de comandos Windows
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3: Reordenamiento de Secciones, Separación y Tabla Compacta de Alertas
- [ ] Task: Escribir tests para la tabla compacta de `AlertsPanel` (un renglón por alerta) y el orden de renderizado en `App.tsx` (Alertas al final)
- [ ] Task: Refactorizar `AlertsPanel.tsx` a un formato tabular de una sola fila por alerta con botón discreto de nueva alerta y encabezado sin icono
- [ ] Task: Actualizar `App.tsx` y `ResetUptimePanel.tsx` eliminando los iconos de los encabezados de sección, agregando separación visual espaciada (`space-y-4` / `space-y-5`) y posicionando Alertas como última sección
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 4: Verificación Integral del Sistema y Build
- [ ] Task: Ejecutar la suite completa de tests automatizados (`npm test`) y build de producción (`npm run build`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
