# Implementation Plan: Blindaje de Seguridad, Sanitización Zero-Secrets y Control de Acceso Corporativo

## Phase 1: Gestor de Configuración Externa Cifrada y Candado de Dominio/Red (`configManager` & `securityGate`) [checkpoint: e761c98]

- [x] Task: Crear gestor de configuración externa y cifrado local (`electron/configManager.cjs`) ce92eb3
  - [x] Write Failing Tests: Crear `src/services/configManager.test.ts` validando carga desde variables de entorno, carga desde ruta UNC/archivo externo `cmda.config.json`, cifrado/descifrado AES-256-GCM con clave corporativa y rechazo cuando faltan secretos.
  - [x] Implement to Pass Tests: Implementar `electron/configManager.cjs` con soporte para `.env` local (desarrollo), lectura de `cmda.config.json` en red interna (UNC) y persistencia cifrada AES-256-GCM / DPAPI, más creación de `.env.example` y `cmda.config.example.json`.
  - [x] Refactor & Verify Coverage: Asegurar >80% de cobertura en `configManager.cjs` y actualizar `.gitignore` para excluir `.env*`, `cmda.config.json`, `*.secure.dat` y `*.vnc`.
- [x] Task: Implementar el Candado Dual Adaptativo de Dominio AD y Red Corporativa (`electron/securityGate.cjs`) e761c98
  - [x] Write Failing Tests: Crear `src/services/securityGate.test.ts` probando los escenarios: (1) sin configuración/clave -> bloqueado, (2) con clave válida + dominio AD válido -> autorizado, (3) con clave válida + fuera de dominio pero con alcance TCP/DNS al servidor corporativo (VPN) -> autorizado, (4) fuera de dominio y sin conexión a la red interna -> bloqueado terminantemente.
  - [x] Implement to Pass Tests: Implementar `electron/securityGate.cjs` integrando verificación de `USERDNSDOMAIN`/`USERDOMAIN`, prueba de alcance TCP al servidor configurado y validación de clave de acceso corporativa.
  - [x] Refactor & Verify Coverage: Verificar cobertura de pruebas unitarias >80%.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Gestor de Configuración Externa Cifrada y Candado de Dominio/Red' (Protocol in workflow.md) e761c98

## Phase 2: Sanitización Zero-Secrets en Servicios Backend, Mocks y Documentación [checkpoint: 6628110]

- [x] Task: Sanitizar `dbService.cjs`, `systemTools.cjs` y `dnsResolver.cjs` eliminando todo dato hardcodeado 6628110
  - [x] Write Failing Tests: Actualizar `src/services/dbService.test.ts`, `src/services/systemTools.test.ts` y `src/services/dnsResolver.test.ts` para verificar que no existan credenciales, IPs ni dominios por defecto en el código y que los módulos consuman dinámicamente `configManager.cjs`.
  - [x] Implement to Pass Tests: Refactorizar `electron/dbService.cjs`, `electron/systemTools.cjs` y `electron/dnsResolver.cjs` para requerir configuración inyectada desde `configManager.cjs`, y eliminar `resources/bin/admin_2.vnc` y `resources/bin/options.vnc` del repositorio.
  - [x] Refactor & Verify Coverage: Confirmar que todos los tests unitarios pasen con datos sintéticos RFC 5737 (`192.0.2.x`).
- [x] Task: Sanitizar el repositorio Mock (`terminalService.ts`), componentes UI y documentación de Conductor 6628110
  - [x] Write Failing Tests: Actualizar `src/services/terminalService.test.ts`, `src/services/dbAdapter.test.ts` y tests de componentes para validar que solo existan terminales sintéticas (`PC-DEMO-001`, `192.0.2.10`, etc.) y que el modo Mock esté deshabilitado cuando el Gatekeeper no autorice la sesión.
  - [x] Implement to Pass Tests: Reemplazar todos los hostnames, IPs, MACs y usuarios reales en `src/services/terminalService.ts`, componentes de UI y archivos Markdown en `conductor/` por equivalentes ficticios seguros.
  - [x] Refactor & Verify Coverage: Ejecutar auditoría automatizada de expresiones regulares sobre el árbol de archivos para verificar 0 fugas de IPs/claves/hostnames reales.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Sanitización Zero-Secrets en Servicios Backend, Mocks y Documentación' (Protocol in workflow.md) 6628110

## Phase 3: Pantalla de Bloqueo Corporativo (`SecurityLockScreen`) e Integración IPC [REVERTIDO]
> **Nota de Reversión (Revert Track)**: A solicitud del usuario mediante `/conductor-revert`, se eliminó el requisito de clave corporativa y la pantalla de bloqueo (`SecurityLockScreen`). La aplicación queda abierta y disponible de forma directa para cualquier usuario sin necesidad de ingresar claves o archivos de configuración externos. El resguardo de seguridad se mantiene íntegramente mediante la política Zero-Secrets en el repositorio (sin IPs sensibles ni credenciales en GitHub) y el acceso natural por red corporativa / VPN.
- [~] Task: Revertido - Prescindir de `SecurityLockScreen.tsx` y requisito de clave corporativa en handlers IPC, habilitando acceso directo a la consola para cualquier usuario.

## Phase 4: Purga Criptográfica del Historial de Git y Auditoría Final [checkpoint: 2fe0692]

- [x] Task: Preservar configuración real local fuera de Git y purgar el historial de commits del repositorio 2fe0692
  - [x] Write Failing Tests: Crear script/test de auditoría de seguridad (`src/test/securityAudit.test.ts`) que escanee archivos rastreados por `git ls-files` buscando patrones prohibidos (IPs privadas reales previas, contraseñas previas, dominio real, hostnames reales).
  - [x] Implement to Pass Tests: Guardar la configuración real actual en un archivo local ignorado por Git (`cmda.config.json` / `.env` local del equipo de desarrollo) para que no pierdas conectividad local, y reescribir el historial de Git para eliminar cualquier rastro de secretos en commits anteriores.
  - [x] Refactor & Verify Coverage: Verificar con `git log -S` y `npm test` que tanto el árbol de trabajo como todo el historial de commits de Git estén 100% limpios antes de hacer push a GitHub.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Purga Criptográfica del Historial de Git y Auditoría Final' (Protocol in workflow.md) 2fe0692
