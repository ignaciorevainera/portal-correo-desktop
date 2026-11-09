# Implementation Plan: Suite de Pruebas E2E con Playwright para Electron, Test Harness Mock/Live y Quality Gates

## Phase 1: Infraestructura E2E, Configuración de Playwright y Test Harness en Electron [checkpoint: e478354]
Configurar la base técnica para ejecutar pruebas automatizadas con Playwright levantando la instancia real de Electron y proveyendo un mecanismo de inyección de datos determinista sin dependencias externas.

- [x] Task: Instalación y configuración de Playwright para Electron [60a4b92]
  - [x] Instalar `@playwright/test` en devDependencies
  - [x] Crear `playwright.config.ts` con configuración para Electron (timeout, reporter, traces/screenshots/videos `on-failure` en `e2e/test-results`)
  - [x] Configurar TypeScript y paths para la carpeta `e2e/`
- [x] Task: Implementar Test Harness y modo dual (`PCD_E2E_MODE`) en el proceso Main [05b68fe]
  - [x] Crear módulo `electron/testHarness.cjs` para interceptar consultas de base de datos y comandos Win32 cuando `PCD_E2E_MODE === 'mock'`
  - [x] Conectar `testHarness` en `electron/main.cjs` para inyectar fixtures predeterminadas de forma segura y transparente
  - [x] Crear fixtures iniciales en `e2e/fixtures/mockData.ts` (equipos `PC-DEMO-001`, alertas, respuestas de ping/nbtstat/arp y subred)
- [x] Task: Smoke test del lanzador de Electron [e478354]
  - [x] Escribir prueba mínima que valide que `_electron.launch` levanta la ventana principal en modo mock y la cierra sin errores
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 2: Page Object Models (POM) y Helpers Reutilizables de Interacción [checkpoint: 62d03b4]
Crear abstracciones mantenibles y tipadas para que cada pantalla o componente del sistema sea interactuable desde los tests E2E sin duplicar selectores ni lógica.

- [x] Task: Implementar MainWindowPOM [e6ace50]
  - [x] Crear `e2e/pom/MainWindowPOM.ts` con selectores para Topbar, input de búsqueda, controles de ventana (minimizar/cerrar) y tarjetas de identidad de terminal
- [x] Task: Implementar ConsolePOM [1853396]
  - [x] Crear `e2e/pom/ConsolePOM.ts` con selectores y acciones para inicio/detención de ping continuo, lectura de líneas del buffer y copiado de bloques en hover
- [x] Task: Implementar SettingsModalPOM [63c05d5]
  - [x] Crear `e2e/pom/SettingsModalPOM.ts` con métodos para abrir diálogo de ajustes, alternar preferencias (line wrap, alto contraste, escala) y guardar
- [x] Task: Implementar SubnetScannerPOM [e56003c]
  - [x] Crear `e2e/pom/SubnetScannerPOM.ts` con métodos para abrir el Drawer de subred, disparar escaneo y esperar la lista de hosts detectados
- [x] Task: Implementar MonitorWindowPOM [62d03b4]
  - [x] Crear `e2e/pom/MonitorWindowPOM.ts` con soporte para detectar la segunda ventana Electron (`monitor.html`), validar su contenido y cerrarla
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [62d03b4]

---

## Phase 3: Implementación de la Suite de Pruebas E2E (Flujos Críticos y Cobertura Expandida)
Desarrollar los casos de prueba E2E de punta a punta cubriendo todos los flujos acordados en la especificación.

- [x] Task: Test E2E de Ciclo de Vida y Ventana Principal [403660d]
  - [x] Crear `e2e/specs/01-lifecycle.spec.ts` validando arranque sin marco, título, botones de ventana y estado inicial limpio
- [~] Task: Test E2E de Búsqueda de Terminal y Renderizado Técnico
  - [ ] Crear `e2e/specs/02-search-and-terminal.spec.ts` validando ingreso de consulta por hostname e IP, resolución IPC y pintado de datos/badges
- [ ] Task: Test E2E de Consola de Diagnóstico de Red y Copiado de Bloques
  - [ ] Crear `e2e/specs/03-network-console.spec.ts` validando ejecución de ping en vivo, streaming continuo, botón detener y copiado en 1 clic de bloques
- [ ] Task: Test E2E de Modal de Ajustes y Persistencia de Preferencias
  - [ ] Crear `e2e/specs/04-settings.spec.ts` validando apertura, cambio de switches y aplicación de estilos/preferencias
- [ ] Task: Test E2E de Escáner de Subred (Drawer)
  - [ ] Crear `e2e/specs/05-subnet-scanner.spec.ts` validando apertura de Drawer, progreso de barrido y visualización de terminales encontradas
- [ ] Task: Test E2E Multiventana de Monitor
  - [ ] Crear `e2e/specs/06-monitor-window.spec.ts` validando lanzamiento de `monitor.html`, sincronización y cierre seguro
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 4: Integración de Scripts, Quality Gates en Pre-Release y Documentación
Formalizar la ejecución de los tests E2E en los pipelines de release del proyecto y documentar las guías de uso para futuros desarrollos.

- [ ] Task: Agregar scripts E2E en package.json
  - [ ] Configurar `npm run test:e2e` y `npm run test:e2e:ui`
- [ ] Task: Integrar Quality Gate en el pipeline de release
  - [ ] Actualizar `release:check` en `package.json` para ejecutar `npm run test:e2e` antes de permitir `release:build`
- [ ] Task: Actualizar guías de Conductor y Workflow
  - [ ] Añadir sección en `conductor/workflow.md` y `conductor/tech-stack.md` documentando el requisito de pruebas E2E para futuros tracks
- [ ] Task: Verificación final de la suite completa y gate de release
  - [ ] Ejecutar `npm test` (unitarios) y `npm run test:e2e` (E2E) confirmando 100% de éxito en verde
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
