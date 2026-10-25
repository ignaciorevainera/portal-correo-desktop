# Specification: Prototipo de Interfaz UI (Consola Unificada)

## 1. Overview
Implementación del prototipo interactivo de interfaz gráfica para **new CMDA** sobre Electron, React 19 y Tailwind CSS v4. Este track establece la consola unificada de monitoreo e inventario de estaciones de trabajo aplicando los tokens de diseño corporativos (OKLCH, Modo Oscuro/Claro, tipografías Geist Sans, Geist Mono y Roboto Slab) y operando sobre un conjunto de datos simulados sintéticos (Mock).

## 2. Functional Requirements

### 2.1 Layout de Consola Unificada
- **Sidebar de Navegación:** Barra lateral colapsable con acceso a vistas: Consola de Terminal, Monitor de Alertas, Historial de Reseteos y Configuración de Tema.
- **Topbar de Búsqueda Global:** Buscador rápido por Hostname corto (ej. `PC-DEMO-001`, `WS-DEMO-002`, `TERM-DEMO-003`) o dirección IP sintética (ej. `192.0.2.101`, `192.0.2.102`, `192.0.2.103`), con atajo de teclado `Ctrl+F` y selector de tema Claro/Oscuro.
- **Barra de Acciones Operativas:** Botones de acceso directo para:
  - Conectar por VNC Viewer (con feedback visual de invocación).
  - Lanzar Asistencia Remota Windows (`msra.exe /offerRA`).
  - Iniciar/Detener Ping continuo en vivo.
  - Consultar Uptime de la estación.

### 2.2 Paneles de Inventario y Diagnóstico
- **Tarjeta de Ficha Técnica (Hardware & SO):** Sistema operativo, Service Pack/Build, Modelo y Procesador, Memoria RAM, Arquitectura, Versión de Antivirus e Internet Explorer, y Fecha de Relevamiento.
- **Tarjeta de Red y Usuarios AD:** Dirección IPv4, Dirección MAC, estado de conexión y listado de usuarios de Active Directory (`userNt`) asociados al equipo.
- **Monitor de Ping Simulado en Vivo:** Consola en tipografía `Geist Mono` mostrando secuencias de paquetes ICMP, latencia en `ms` y estado de conectividad.
- **Panel de Alertas de Terminal:** Visualización de alertas activas, modal/formulario para dar de alta una nueva alerta y opción de cierre con texto de resolución.
- **Panel de Reseteo de Cuenta y Uptime:** Estado de solicitud de reseteo en proceso e historial de registros de actividad.

### 2.3 Dataset Mock Sintético
- Inclusión de registros sintéticos (RFC 5737) para pruebas y demostración:
  1. `PC-DEMO-001` (`192.0.2.101` - Windows 10, 8.192 MB RAM, usuarios `operador.demo01 | operador.demo02`).
  2. `WS-DEMO-002` (`192.0.2.102` - Windows 10, 4.096 MB RAM, usuario `operador.demo03`).
  3. `TERM-DEMO-003` (`192.0.2.103` - Windows 11 Pro x64, 16.384 MB RAM, usuario `operador.demo04`).

## 3. Non-Functional Requirements
- **Design System Compliance:** Uso estricto de tokens OKLCH definidos en `product-guidelines.md` para modo claro (`:root`) y oscuro (`.dark`).
- **Tipografía:** `Roboto Slab` en encabezados, `Geist Sans` en interfaz general y `Geist Mono` en direcciones IP, MAC, nombres de host y consola de ping.
- **Responsividad de Ventana:** Adaptación fluida en resoluciones de escritorio desde `1024x768` hasta `1920x1080+`.
- **Calidad y Tests:** Cobertura de pruebas unitarias y de componentes `>80%` con Vitest y React Testing Library.

## 4. Acceptance Criteria
- [ ] El usuario puede buscar un equipo tanto por su Hostname (`TERM-DEMO-003`) como por su IP (`192.0.2.103`) y visualizar su ficha completa.
- [ ] El cambio entre Modo Oscuro y Modo Claro aplica inmediatamente los tokens OKLCH corporativos.
- [ ] El botón de Ping inicia una simulación interactiva en vivo con métricas de latencia.
- [ ] El usuario puede crear y cerrar una alerta de prueba sobre la terminal seleccionada.
- [ ] La aplicación levanta correctamente como ventana nativa de Electron y pasa la suite de pruebas en Vitest.
