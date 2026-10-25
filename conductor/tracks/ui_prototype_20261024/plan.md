# Implementation Plan: Prototipo de Interfaz UI (Consola Unificada)

## Phase 1: Andamiaje Base Electron + React + Tailwind OKLCH + Vitest
- [x] Task: Inicializar proyecto Electron + Vite + React + TypeScript y entorno de pruebas
  - [x] Crear `package.json`, configuración de TypeScript, Vite y proceso Main/Preload de Electron
  - [x] Configurar Vitest y React Testing Library para pruebas unitarias y de componentes
  - [x] Escribir test inicial de humo verificando el renderizado base de la aplicación (Red/Green)
- [x] Task: Configurar sistema de diseño OKLCH, Modo Claro/Oscuro y tipografías corporativas
  - [x] Escribir tests para el proveedor de tema (Light/Dark toggle y persistencia de clase `.dark`)
  - [x] Configurar CSS global con variables OKLCH (`--background`, `--primary`, `--card`, etc.) y fuentes `Roboto Slab`, `Geist Sans` y `Geist Mono`
  - [x] Implementar componente `ThemeToggle` y verificar paso de pruebas
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Servicio de Datos Mock y Motor de Búsqueda Inteligente (Hostname / IP)
- [x] Task: Construir repositorio Mock de terminales y servicio de búsqueda dual
  - [x] Escribir tests unitarios en Vitest para búsqueda exacta y parcial por Hostname (`PC-DEMO-001`, `WS-DEMO-002`, `TERM-DEMO-003`) y por dirección IP (`192.0.2.101`, `192.0.2.102`, `192.0.2.103`)
  - [x] Implementar dataset Mock tipado con fichas de hardware, red, usuarios AD, alertas e historial de uptime/reseteos
  - [x] Implementar funciones de búsqueda, alta/cierre simulado de alertas y generador de eventos de ping
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Consola Unificada y Paneles Operativos
- [x] Task: Implementar Shell de la Consola Unificada (Sidebar + Topbar con buscador Ctrl+F)
  - [x] Escribir tests de componente para el buscador global, atajo `Ctrl+F` y selección de terminal
  - [x] Implementar `Sidebar` colapsable y `Topbar` con autocompletado/sugerencias rápidas de terminales e IPs
- [x] Task: Implementar Tarjetas de Inventario Técnico y Barra de Acciones Rápidas
  - [x] Escribir tests para la visualización de datos de Hardware, SO, Red, Usuarios AD y disparo de acciones (VNC, MSRA, Ping, Uptime)
  - [x] Implementar componentes `HardwareCard`, `NetworkAdCard`, `QuickActionsBar` y `LivePingConsole`
- [x] Task: Implementar Paneles de Gestión de Alertas e Historial de Reseteos/Uptime
  - [x] Escribir tests para creación y cierre de alertas activas en la vista de terminal
  - [x] Implementar componentes `AlertsPanel` (con formulario de alta/cierre) y `ResetUptimePanel`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
