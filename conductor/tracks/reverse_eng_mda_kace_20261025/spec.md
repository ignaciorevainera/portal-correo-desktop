# Specification: Ingeniería Inversa, Análisis Comparativo y Extracción de Features (CMDA-2, HMDA v1/v1.1/v2.0 y KACE)

## Overview
El objetivo de este track es realizar una auditoría técnica profunda, descompilación e ingeniería inversa de los sistemas legados y herramientas de soporte alojadas en `C:\MDA`:
1. **CMDA-2 (`C:\MDA\CMDA-2`):** Análisis comparativo contra el aplicativo original de Visual Basic 6 para detectar diferencias en ejecutables, cadenas de conexión, configuraciones VNC, utilitarios auxiliares (`MIke_uptime.exe`, `uptime.exe`), logs de error y dependencias ActiveX/OCX.
2. **HMDA (`C:\MDA\HMDA`, `C:\MDA\HMDA1.1`, `C:\MDA\HMDA2.0`):** Descompilación e ingeniería inversa de la suite .NET Framework 4.7.2 (C#) para extraer su arquitectura, contratos de datos, integración con Microsoft Graph / M365 (Azure AD / MSAL), conexiones a bases de datos (MySQL y SQL Server CE), sistema de plantillas de correo, botones de operador configurables (`bt_edit1..3`) y notificaciones Toast nativas de Windows (`Microsoft.Toolkit.Uwp.Notifications`).
3. **KACE Systems Management (`C:\MDA\KACE`):** Análisis de binarios del agente corporativo Quest KACE, específicamente `kwol.exe` (Wake-on-LAN), `runkbot.exe` (ejecución remota forzada de tareas de inventario/parcheo), estructura de logs (`Inventory.log`) y telemetría de estación de trabajo.
4. **Matriz de Paridad y Roadmap Unificado para Portal Correo Desktop (`new-CMDA`):** Diseñar las especificaciones técnicas y módulos PoC para que nuestra aplicación moderna (Electron + React 19 + Tailwind CSS + Shadcn UI) unifique las mejores capacidades de estos aplicativos (WOL, sincronización KACE, botones personalizables, reportería y notificaciones).

---

## Functional Requirements

### 1. Análisis Diferencial CMDA-2 vs CMDA Original
- **Inspección de Binarios PE y Hashes:** Extraer hashes criptográficos (SHA-256), metadatos PE, cadenas de texto legibles (ASCII/Unicode) de `C:\MDA\CMDA-2\CMDA.exe` y contrastarlas con la versión base y el subdirectorio `CMDA-2\CMDA`.
- **Análisis de Configuraciones y Dependencias:** Auditar los archivos `admin_2.vnc`, `options.vnc`, dependencias ActiveX (`TABCTL32.OCX`), gráficos vectoriales (`tarjeta.cdr`, `tipo.cdr`) y evaluar discrepancias en el archivo `Errores.Err`.
- **Utilidades Uptime:** Analizar el comportamiento de los binarios complementarios `uptime.exe` y `MIke_uptime.exe` (llamadas API de Windows para tiempo de actividad del sistema).

### 2. Descompilación y Análisis Estático de HMDA (v1, v1.1 y v2.0)
- **Descompilación de Ensamblados .NET:** Utilizar inspección IL, desensamblado y reflexión de .NET sobre `HMDA.exe` en sus tres versiones (`v1`, `v1.1`, `v2.0`) para extraer namespaces, clases, métodos públicos/privados y lógica de negocio.
- **Integración con Microsoft Graph / Azure AD:**
  - Identificar endpoints de Microsoft Graph, permisos/scopes solicitados (`User.Read`, `Mail.Send`, etc.), Client ID y Tenant ID de Azure AD / MSAL.
  - Extraer la lógica de envío de correos corporativos y manejo de plantillas (`correo_inicio`, `correo_final`, `correo_asunto`, `cc`, firmas).
- **Capa de Persistencia y Conectividad a Bases de Datos:**
  - Auditar el uso de `MySql.Data.dll` y connection strings (`DefaultConnection`, SQL Server CE `|SQL/CE|`).
  - Mapear tablas, consultas SQL y procedimientos utilizados para inventario o alertas.
- **Experiencia de Usuario y Personalización:**
  - Extraer la lógica de los botones configurables de operador (`bt_edit1_nombre`, `bt_edit1_color`, `bt_edit1_enlace`, `bt_edit1_nomreal`).
  - Analizar parámetros de ventana (`Fijar`, `Transparente`, temas de color `Color_B`, `Color_F`).
  - Documentar la emisión de alertas interactivas mediante `Microsoft.Toolkit.Uwp.Notifications.dll` (Windows Toast).
- **Procesamiento de Documentos:** Evaluar la integración con `DocumentFormat.OpenXml.dll` y `SpreadsheetLight.dll` para exportación de reportes Excel.

### 3. Ingeniería Inversa de Binarios KACE Systems Management
- **Wake-on-LAN (`kwol.exe`):** Determinar la sintaxis de línea de comandos, argumentos aceptados (MAC address, IP broadcast, puerto UDP 7/9) y comportamiento en red corporativa.
- **Agente de Tareas e Inventario (`runkbot.exe`):** Documentar los códigos de ejecución estándar de KACE (ej. `runkbot 4 0` para inventario forzado, tareas de scripts, actualización de inventario).
- **Diagnóstico y Telemetría:** Analizar utilitarios de estado (`kstatus.exe`, `klog.exe`, `Inventory.exe`, `Inventory.log`) y cómo consultar el estado del agente KACE desde la consola de soporte.

### 4. Síntesis Técnica, Paridad y Módulo de Integración para new-CMDA
- **Matriz de Paridad Integral:** Crear una matriz comparativa detallada entre CMDA (original), CMDA-2, HMDA (v1/1.1/2.0), KACE y `new-CMDA` evaluando arquitectura, seguridad, dependencias y cobertura funcional.
- **Módulo PoC de Integración en Electron:** Diseñar e implementar un puente seguro en Electron Main (`electron/kaceBridge.cjs` o servicio correspondiente) con pruebas TDD en Vitest para ejecutar Wake-on-LAN (`kwol.exe` o socket UDP nativo) y comandos de diagnóstico KACE (`runkbot.exe`).
- **Roadmap de Adopción Unificada:** Planificar la incorporación armónica de las features descubiertas en la interfaz de Shadcn UI de `new-CMDA` (ej. botón de Wake-on-LAN, trigger de sincronización KACE, botones personalizables en la barra superior/menú contextual, exportación Excel limpia y notificaciones de escritorio).

---

## Non-Functional Requirements
- **Modo Solo Lectura (Non-Destructive):** Las carpetas y archivos en `C:\MDA` no deben ser modificados, movidos ni eliminados. Toda la ingeniería inversa debe realizarse de forma pasiva y segura.
- **Arquitectura Zero-Secrets:** Si se descubren credenciales, secretos, tokens o contraseñas en los binarios legados, deben ser sanitizados y documentados únicamente como patrones o advertencias de seguridad, sin exponer secretos sensibles en el repositorio Git.
- **Trazabilidad y Calidad:** Toda la investigación debe quedar consolidada en un informe técnico de arquitectura markdown en `docs/reverse_engineering_mda_kace_report.md` con enlaces, snippets y diagramas explicativos.

---

## Acceptance Criteria
- [ ] Hashes SHA-256 y diferencias de binarios/recursos entre CMDA-2 y el CMDA original completamente identificados y documentados.
- [ ] Métodos, contratos, integración Microsoft Graph, MySQL y flujo de botones configurables de HMDA (v1, v1.1, v2.0) extraídos y explicados.
- [ ] Sintaxis y funcionalidad de `kwol.exe` y `runkbot.exe` de KACE documentados con ejemplos de ejecución.
- [ ] Matriz de paridad comparativa generada entre todos los aplicativos.
- [ ] Módulo PoC / servicio con pruebas unitarias en Vitest que demuestre la invocación y validación de parámetros de WOL / KACE.
- [ ] Informe técnico consolidado disponible en `docs/reverse_engineering_mda_kace_report.md`.

---

## Out of Scope
- Modificación directa del código fuente o re-compilación de los binarios legacy cerrados en `C:\MDA`.
- Modificación de la base de datos de producción corporativa o del servidor KACE en vivo.
