# Specification: Suite de Pruebas E2E con Playwright para Electron, Test Harness Mock/Live y Quality Gates

## 1. Overview
Este track implementa una suite integral de pruebas End-to-End (E2E) sobre Electron 34 utilizando Playwright (`@playwright/test`), complementando la pirámide de testing del proyecto. Permite verificar flujos completos de usuario, ciclo de vida de procesos (Main, Renderer, IPC y ventanas secundarias), manipulación del DOM y renderizado real de la interfaz.

Incorpora un **Test Harness** con soporte de Modo Dual (`mock` por defecto / `live` opcional) para desacoplar las pruebas de la VPN o la base de datos SQL corporativa, asegurando velocidad y determinismo absoluto en entornos locales y CI. Asimismo, institucionaliza un **Quality Gate** estricto en el pipeline de release (`release:check`) y en los futuros tracks de Conductor.

---

## 2. Functional Requirements

### 2.1 Configuración y Arquitectura E2E (Playwright + Electron)
- **Instalación y Configuración:** Configurar `@playwright/test` en la raíz del proyecto con archivo de configuración dedicado `playwright.config.ts`.
- **Aislamiento de Tests:** Directorio raíz `e2e/` separado de `src/test/` para evitar colisiones con el runner de Vitest.
- **Lanzador de Electron:** Inicialización y cierre seguro de la aplicación Electron mediante `_electron.launch` pasando los switches y variables de entorno requeridas (`--no-sandbox`, software rendering, flag de test).
- **Page Object Models (POM):**
  - `MainWindowPOM`: Navegación, controles de ventana, barra de búsqueda y ficha técnica de terminal.
  - `ConsolePOM`: Panel de consola de diagnósticos, inicio/detención de ping, streaming de logs y copiado de bloques.
  - `SettingsModalPOM`: Apertura de ajustes, modificación de opciones (alto contraste, line wrap, escala de texto) y guardado.
  - `SubnetScannerPOM`: Apertura del drawer de subred, ejecución de escaneo y validación de hosts detectados.
  - `MonitorWindowPOM`: Invocación de ventana secundaria Monitor (`monitor.html`), verificación de sincronización IPC y cierre.

### 2.2 Test Harness y Modo Dual (Mock / Live)
- **Activación por Entorno:** Variable de entorno `PCD_E2E_MODE=mock` (por defecto) o `PCD_E2E_MODE=live`.
- **Fixtures Deterministas (`e2e/fixtures/`):**
  - Datos de terminal para búsqueda por hostname (`PC-DEMO-001`) e IP (`192.0.2.101`).
  - Alertas activas y solicitudes de reseteo de cuenta.
  - Respuestas simuladas para comandos Win32 (`ping`, `nbtstat`, `tracert`, `arp`, `net user`).
  - Resultados simulados de escaneo de subred `/24`.
- **Intercepción Transparente en Proceso Main:**
  - Cuando `PCD_E2E_MODE === 'mock'`, el proceso `main.cjs` utiliza proveedores en memoria / stubs en lugar de intentar conectar a la base de datos MSSQL o invocar procesos binarios externos que requieran permisos de dominio o red corporativa.

### 2.3 Cobertura de Escenarios E2E (Suite Inicial Expandida)
1. **Flujo de Arranque y Ventana Principal:**
   - La ventana se inicia sin marco, se renderizan correctamente la barra de título, controles de ventana y el estado inicial limpio.
2. **Flujo de Búsqueda y Ficha Técnica:**
   - Ingreso de hostname en el input de búsqueda.
   - Envío de consulta y recepción de datos por IPC.
   - Renderizado verificado de datos de hardware, sistema operativo, IP, MAC y badges de estado.
3. **Flujo de Diagnóstico y Consola de Red:**
   - Disparo de ping continuo hacia la terminal.
   - Verificación de recepción de líneas en el buffer de la consola.
   - Detención manual del ping.
   - Interacción con bloques de consola y validación de copiado al portapapeles.
4. **Flujo de Ajustes y Preferencias:**
   - Apertura del `SettingsModal`.
   - Modificación de preferencias (ej. line wrap y escalado de texto).
   - Guardado y verificación de persistencia en la interfaz.
5. **Flujo de Escáner de Subred (Drawer):**
   - Apertura del drawer deslizable de subred.
   - Inicio de escaneo con fixture y visualización de terminales vivas en la lista.
6. **Flujo Multiventana (Ventana Monitor):**
   - Apertura de la ventana secundaria de monitorización (`monitor.html`).
   - Verificación de renderizado de la ventana secundaria y cierre limpio sin fugas de proceso.

---

## 3. Non-Functional Requirements
- **Determinismo y Rendimiento:** La suite E2E completa en modo mock debe ejecutarse en menos de 60 segundos en un entorno local estándar.
- **Diagnóstico y Trazabilidad:** Configuración de Playwright con captura de capturas de pantalla (`screenshot: 'only-on-failure'`), trazas (`trace: 'retain-on-failure'`) y video (`video: 'retain-on-failure'`) alojados en `e2e/test-results/`.
- **Independencia de Red:** Ningún test en modo mock debe requerir conexión a internet, VPN o dominio Active Directory.

---

## 4. Integration & Quality Gates
- **Nuevos Scripts en `package.json`:**
  - `npm run test:e2e`: Ejecuta la suite de Playwright en modo headless.
  - `npm run test:e2e:ui`: Abre la UI interactiva de Playwright para desarrollo visual y depuración.
- **Integración con Pre-Release Gate:**
  - Modificación del script `npm run release:check` para incorporar `npm run test:e2e` antes de permitir la construcción del instalador con `npm run release:build`.
- **Estándar de Conductor:**
  - Actualización de `conductor/workflow.md` para incluir el requisito de validación E2E en la definición de tareas y verificación de fase.

---

## 5. Out of Scope
- Reemplazo o eliminación de los tests unitarios existentes en `src/test/` (se mantienen como base rápida de la pirámide de pruebas).
- Mocks para servicios en la nube de terceros no pertenecientes a la infraestructura interna del proyecto.
