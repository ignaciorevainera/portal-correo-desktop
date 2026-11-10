# Track Spec: Racionalización de la Suite de Pruebas: Poda de JSDOM Redundante y Migración a Playwright E2E

## Contexto y Motivación
Tras la implementación exitosa de la suite E2E de Playwright (`e2e/specs/` 00 a 07), se identificaron múltiples suites de pruebas unitarias que intentan montar la aplicación completa en JSDOM (`@testing-library/react`). Estos tests:
1. Son redundantes con los tests E2E que corren en navegadores reales.
2. Ralentizan `npm test` introduciendo penalizaciones de tiempo innecesarias (>40s).
3. Generan advertencias de React 19 `act(...)` por asincronía en un entorno simulado de DOM.

## Objetivos
1. **Migración a E2E:** Asegurar que los flujos de menú contextual (`OperatorContextMenu`) y de modal de información (`InfoModal`) queden cubiertos en `e2e/specs/08-operator-context-menu.spec.ts` y `e2e/specs/09-info-modal.spec.ts`.
2. **Poda Controlada:** Eliminar los archivos de prueba JSDOM identificados como 100% redundantes, preservando intactos los tests de seguridad, parsers puros y servicios de Node.js.
3. **Quality Gates:** Validar que `npm test`, `npm run test:e2e` y `npm run release:check` pasen en verde con tiempos de ejecución significativamente reducidos.

## Criterios de Aceptación
- Cobertura 0% perdida: Los casos de usuario de menú contextual e InfoModal funcionan en E2E.
- Cero advertencias ruidosas en consola durante `npm test`.
- 100% verde en `npm test` y `npm run test:e2e`.
