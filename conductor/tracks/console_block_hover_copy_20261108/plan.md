# Implementation Plan: Copiado Granular por Bloques en Hover para Consola Principal (LivePingConsole)

## Phases

### Phase 1: Motor de Segmentación de Bloques y Lógica de Extracción de Texto (TDD) [checkpoint: 9b6a627]
- [x] Task: (TDD) Pruebas y función utilitaria para segmentar líneas en bloques (9b6a627)
  - [x] Escribir pruebas unitarias en `src/test/consoleBlockSegmentation.test.ts` que verifiquen la segmentación correcta de arrays de `ConsoleLine` en bloques con ID estable, comando inicial, líneas de respuesta y mensaje de finalización
  - [x] Implementar la función de segmentación `groupConsoleLinesIntoBlocks(lines: ConsoleLine[]): ConsoleBlock[]` con tipado riguroso, manejo de líneas previas y tolerancia a recorte circular de buffer
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 2: Renderizado Interactivo en `LivePingConsole`, Estilos Hover y Botón de Copiado (TDD) [checkpoint: 91a8950]
- [x] Task: (TDD) Pruebas y renderizado del componente de bloque con hover y botón de copia (368c401)
  - [x] Escribir pruebas unitarias en `src/test/LivePingConsole.test.tsx` que verifiquen:
    - Renderizado de cada bloque en su contenedor `[data-testid="console-block"]` con su respectivo `data-block-id`
    - Presencia del botón de copia `[aria-label^="Copiar bloque"]` dentro de cada bloque
    - Invocación de `navigator.clipboard.writeText` con el texto exacto del bloque seleccionado al hacer clic
    - Transición del estado visual del botón (ícono `Check` verde y texto para screen reader)
    - Convivencia pacífica con la selección de texto (`select-text`) y los botones globales de cabecera
  - [x] Refactorizar el renderizado del listado de líneas en `src/components/LivePingConsole.tsx` para agrupar por bloques memorizados (`useMemo`)
  - [x] Integrar el micro-estado de copiado por bloque (con timeout de 2000 ms), clases Tailwind (`group relative hover:bg-muted/10 rounded-md transition-colors`, botón flotante `opacity-0 group-hover:opacity-100`) y anuncio accesible
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3: Verificación Integral, Rendimiento y Quality Gate
- [ ] Task: Ejecución y validación de la suite completa de calidad y empaquetado
  - [ ] Ejecutar todos los tests unitarios con `npm test` verificando 100% de casos exitosos
  - [ ] Ejecutar `npm run release:check` (`vitest`, `audit:contrast`, `tsc`, `vite build`) asegurando cero errores
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
