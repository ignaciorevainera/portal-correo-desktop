# Implementation Plan: Ingeniería Inversa, Análisis Comparativo y Extracción de Features (CMDA-2, HMDA v1/v1.1/v2.0 y KACE)

## Phase 1: Análisis Diferencial de Binarios y Estructura Legacy (CMDA-2 vs CMDA Original) [checkpoint: f8400a0]
- [x] Task: Inspección de arquitectura, firmas PE, cadenas de texto y hashing comparativo de ejecutables CMDA.exe [f8400a0]
  - [x] Calcular y comparar hashes SHA-256 de `C:\MDA\CMDA-2\CMDA.exe` y `C:\MDA\CMDA-2\CMDA\CMDA.exe` [f8400a0]
  - [x] Extraer strings legibles (ASCII y Unicode) de ambos ejecutables para buscar diferencias en cadenas de conexión, queries SQL o rutas [f8400a0]
  - [x] Comparar headers PE, subsistemas, importaciones y dependencias DLL/OCX [f8400a0]
- [x] Task: Análisis de archivos auxiliares (.vnc, OCX, CDR, Uptime utilities) y diferencias en log Errores.Err [f8400a0]
  - [x] Analizar contenido de `admin_2.vnc` y `options.vnc` para mapear parámetros VNC y flags de visualización [f8400a0]
  - [x] Evaluar binarios auxiliares `uptime.exe` y `MIke_uptime.exe` identificando APIs de Windows (`GetTickCount`, etc.) [f8400a0]
  - [x] Analizar estructura y patrones de fallos en `Errores.Err` [f8400a0]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: f8400a0]

## Phase 2: Descompilación e Ingeniería Inversa de HMDA (v1, v1.1 y v2.0 - .NET / C#) [checkpoint: 562f6d1]
- [x] Task: Desensamblado / descompilación IL y extracción de tipos, métodos y namespaces en HMDA.exe [562f6d1]
  - [x] Inspeccionar metadatos de ensamblado, versiones de runtime y dependencias cargadas en HMDA v1, v1.1 y v2.0 [562f6d1]
  - [x] Extraer clases principales, formularios WinForms/WPF y controladores de eventos mediante reflexión e inspección IL [562f6d1]
  - [x] Mapear el ciclo de vida de la aplicación y diferencias estructurales entre v1, v1.1 y v2.0 [562f6d1]
- [x] Task: Análisis de lógica de negocio e integración con Microsoft Graph / M365 y Azure AD [562f6d1]
  - [x] Extraer configuración de MSAL / Azure AD (Client ID, Scopes, endpoints OAuth2) [562f6d1]
  - [x] Analizar llamadas a Microsoft Graph API (`Microsoft.Graph.dll`, Kiota) para lectura de perfiles y envío de correos [562f6d1]
  - [x] Analizar lógica de generación y despacho de plantillas de correo (`correo_inicio`, `correo_final`, `correo_asunto`, `cc`, firmas) [562f6d1]
- [x] Task: Análisis de persistencia y base de datos (MySql.Data, SQL Server CE) [562f6d1]
  - [x] Inspeccionar inicialización y uso de `MySql.Data.dll` y queries ejecutadas hacia el servidor MySQL [562f6d1]
  - [x] Analizar la cadena de conexión `DefaultConnection` (`|SQL/CE|`) y uso de bases de datos locales compactas [562f6d1]
  - [x] Auditar credenciales y rutas de red configuradas [562f6d1]
- [x] Task: Análisis de UI interactiva, botones de operador, personalización y notificaciones Toast [562f6d1]
  - [x] Documentar el mecanismo de botones dinámicos configurables (`bt_edit1_nombre`, `bt_edit1_enlace`, etc.) [562f6d1]
  - [x] Analizar parámetros visuales (`Transparente`, `Fijar`, fuentes y colores personalizados) [562f6d1]
  - [x] Analizar la integración de `Microsoft.Toolkit.Uwp.Notifications` para envío de notificaciones nativas de Windows [562f6d1]
  - [x] Analizar la generación de planillas Excel con `SpreadsheetLight.dll` y `DocumentFormat.OpenXml.dll` [562f6d1]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 562f6d1]

## Phase 3: Análisis de Binarios de KACE Systems Management y Mecanismos de Integración
- [x] Task: Análisis funcional y de sintaxis de kwol.exe (Wake-on-LAN corporativo) [b8254d5]
  - [x] Extraer strings, argumentos CLI y parámetros esperados de `C:\MDA\KACE\kwol.exe` [b8254d5]
  - [x] Verificar el formato de envío de paquetes mágicos WOL (MAC address, IP broadcast, puerto UDP 7/9) [b8254d5]
- [x] Task: Análisis de runkbot.exe, KInventory.exe y parámetros de sincronización forzada [b8254d5]
  - [x] Determinar códigos de ejecución de `runkbot.exe` (ej. inventario `runkbot 4 0`, comprobación de scripts/parches) [b8254d5]
  - [x] Documentar utilidades auxiliares (`kstatus.exe`, `klog.exe`, `KDeploy.exe`, `KacePatch.exe`) [b8254d5]
- [x] Task: Auditoría de telemetría y estructura de logs de agente KACE [b8254d5]
  - [x] Analizar formato de `Inventory.log` y ciclo de inventariado de estación [b8254d5]
  - [x] Documentar patrones de cómo una aplicación de soporte puede monitorear o disparar acciones en KACE [b8254d5]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Síntesis Técnica, Matriz de Paridad y PoCs de Integración para new-CMDA
- [ ] Task: Redacción de documentación técnica exhaustiva y matriz de paridad en docs/
  - [ ] Redactar informe consolidado en `docs/reverse_engineering_mda_kace_report.md` con hallazgos de CMDA-2, HMDA y KACE
  - [ ] Construir la matriz comparativa de features y tecnologías entre todos los aplicativos vs `new-CMDA`
- [ ] Task: Desarrollo de módulo PoC seguro en Electron Main con pruebas unitarias TDD
  - [ ] Escribir tests unitarios en Vitest para servicio bridge de KACE/WOL (`test/kaceBridge.test.ts` o equivalente)
  - [ ] Implementar servicio de invocación segura de Wake-on-LAN y KACE CLI con validación estricta de parámetros
- [ ] Task: Roadmap arquitectónico de unificación para Portal Correo Desktop
  - [ ] Documentar recomendaciones y especificaciones para botones personalizables en UI
  - [ ] Especificar integración de notificaciones nativas Toast y exportación Excel (.xlsx) en `new-CMDA`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
