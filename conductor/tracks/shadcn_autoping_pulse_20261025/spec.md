# Specification: Incorporación de Shadcn UI (`preset b5XRZYXrNg`), Auto-Ping al Buscar Terminal, Sin Auto-Scroll y Animación de Pulsación

## 1. Overview
Este track incorpora de forma oficial y obligatoria el ecosistema de **shadcn/ui** aplicando el preset `shadcn@latest apply --preset b5XRZYXrNg` (incluyendo su configuración `components.json`, tipografías, tokens y componentes base como `Button`, `Card`, `Badge`, `Input`), y refina la experiencia operativa del diagnóstico de red para que al buscar o seleccionar una terminal se ejecute automáticamente un ping estándar de 4 paquetes, sin desviar el scroll de la vista principal y mostrando una animación de pulsación mientras el proceso de ping está activo.

## 2. Functional Requirements

### 2.1 Incorporación Obligatoria de `shadcn/ui` con Preset `b5XRZYXrNg`
- **Aplicación del Preset:** Ejecutar e integrar la configuración oficial `shadcn@latest apply --preset b5XRZYXrNg` en el proyecto (`components.json`, utilidades `src/lib/utils.ts` con `cn`, fuentes incorporadas en el preset y variables CSS en `src/index.css`).
- **Configuración de Alias:** Configurar el alias `@/*` apuntando a `./src/*` en `tsconfig.json` y `vite.config.ts` para compatibilidad nativa con los componentes de `shadcn`.
- **Adopción de Componentes Primitivos:**
  - Instalar y utilizar los componentes de `shadcn/ui` (`Button`, `Card`, `Badge`, `Input`, etc.) en los módulos de la interfaz (`Topbar`, `QuickActionsBar`, `NetworkAdCard`, `HardwareCard`, `LivePingConsole`, `AlertsPanel`, `ResetUptimePanel`), garantizando dimensiones estables sin desplazamientos de layout (layout shifts).

### 2.2 Auto-Ping de 4 Tics al Buscar o Seleccionar una Terminal
- **Disparo Automático:** Cada vez que el operador busque o seleccione una terminal válida (`searchTerminalUnified` resuelva con datos de terminal), la aplicación debe iniciar automáticamente un **Ping estándar de 4 paquetes (4 tics)** hacia la IP de la terminal (`pingMode = 'standard'`, `isPinging = true`).
- **Finalización Automática del Estado (`onPingComplete`):** Cuando el proceso de ping estándar de 4 paquetes termine (evento `onDone` de `subscribeToPing`), el estado `isPinging` debe pasar automáticamente a `false` para que el botón y su animación de pulsación reflejen que el ping ha concluido, manteniendo los resultados visibles en `LivePingConsole`.

### 2.3 Eliminación Total de Redirección / Auto-Scroll al Hacer Ping
- **Sin Desplazamiento Forzado:** Al iniciarse un ping (ya sea automáticamente al buscar terminal, pulsando el botón `Ping`, el botón `Ping -t`, desde el menú contextual o mediante el atajo `F3`), **bajo ninguna circunstancia** se debe redirigir ni hacer scroll (`scrollIntoView`) hacia la sección de la consola de ping dentro del `<main>`. El operador mantiene el control total de su posición de lectura en la vista principal.

### 2.4 Animación de Pulsación Durante el Ping
- **Efecto de Pulsación (`animate-pulse`):** Mientras se esté realizando un ping (`isPinging === true`), el indicador e icono de actividad en `QuickActionsBar` y `LivePingConsole` debe mostrar una **animación de pulsación** (`animate-pulse`) en lugar de rotar el icono (`animate-spin`).

## 3. Non-Functional Requirements
- **Estabilidad Visual:** Ningún botón o acción interactiva (como copiar campos o copiar logs) debe alterar las dimensiones o provocar desplazamientos en píxeles de los contenedores adyacentes.
- **Zero-Secrets & Tests:** Mantener el 100% de las pruebas unitarias y de seguridad pasando en Vitest.
