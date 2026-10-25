# Specification: Global Hotkey with Clipboard Autofill & Async Subnet Scanner

## Overview
Implementación en **Portal Correo Desktop** de dos capacidades de alta productividad inspiradas en la ingeniería inversa de HMDA y requeridas por la operación:
1. **Atajo Global (`Ctrl + Espacio`) con Autofocus y Detección de Portapapeles:** Permite invocar la aplicación desde segundo plano o minimizada, trayéndola al frente y analizando el texto del portapapeles. Si el contenido coincide con un patrón válido de terminal (Hostname corporativo o dirección IP), se pega automáticamente en la barra de búsqueda y se dispara la consulta; si no coincide, enfoca la barra y selecciona el texto existente para permitir tipeo inmediato.
2. **Escáner Visual y Asíncrono de Subred (`scanIP`):** Permite al operador pulsar el botón "Escanear Subred" a partir del segmento `/24` de la terminal activa (o ingresado manualmente). El escaneo se ejecuta en background de forma asíncrona por lotes (streaming progresivo de hosts detectados) y se visualiza en un panel lateral deslizable (Sheet/Drawer) en tiempo real, garantizando **cero lag, cero bloqueos de la UI** y permitiendo continuar interactuando con la ficha del equipo actual.

---

## Functional Requirements

### 1. Global Hotkey (`Ctrl + Espacio`) y Portapapeles
- **Registro Global:** Registrar el atajo de teclado de sistema `CommandOrControl+Space` en el proceso principal de Electron (`globalShortcut`).
- **Restauración y Enfoque:** Al activarse el atajo:
  - Si la ventana está minimizada, se restaura (`mainWindow.restore()`).
  - Se muestra y se trae al primer plano (`mainWindow.show()`, `mainWindow.focus()`).
- **Lectura e Inferencia de Portapapeles (`electron.clipboard`):**
  - Obtener el texto actual del portapapeles.
  - Evaluar si cumple con un patrón de búsqueda válido:
    - Hostname corporativo (alfanumérico con guiones, ej. `PC-DEMO-001`).
    - Dirección IPv4 válida (`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`).
  - Si es válido: enviar evento IPC al Renderer con el valor y flag `autoSearch: true`.
  - Si no es válido o está vacío: enviar evento IPC para enfocar el input y seleccionar el texto existente sin reemplazarlo.
- **Configurabilidad y Limpieza:** El atajo debe desregistrarse de forma limpia al cerrar o recargar la aplicación (`app.on('will-quit')`).

### 2. Motor de Escaneo de Subred Asíncrono (`electron/subnetScanner.cjs`)
- **Cálculo de Rango `/24`:** A partir de una IP objetivo (ej. `192.0.2.45`), calcular el rango de 1 a 254 (`192.0.2.1` a `192.0.2.254`).
- **Escaneo Asíncrono Concurrente por Lotes:**
  - Evitar saturar el socket de red o el event loop agrupando en lotes concurrentes (concurrencia de 16-32 pings paralelos).
  - Timeout corto y configurable por host (250–400 ms) para asegurar rapidez.
  - Para cada host activo (`alive: true`), resolver su Hostname mediante resolución DNS inversa (`dns.reverse()`) de Node.js.
- **Transmisión de Eventos en Tiempo Real (Streaming IPC):**
  - No esperar a que terminen las 254 IPs para enviar resultados.
  - Emitir eventos continuos `subnet-scanner:host-found` con la información del equipo conforme se detecta.
  - Emitir eventos de progreso `subnet-scanner:progress` (`scanned`, `total`, `activeCount`).
  - Emitir evento de finalización `subnet-scanner:done`.
- **Cancelación Inmediata:** Soporte de abortar escaneo (`subnet-scanner:abort`) si el operador lo cancela o inicia una nueva búsqueda.

### 3. Visualización en Interfaz (React + Tailwind + Shadcn UI)
- **Botón de Disparo en Barra/Header:** Botón "Escanear Subred" visible junto a la información de IP de la terminal actual.
- **Panel Deslizable (Drawer / Sheet):**
  - Se despliega desde el lateral derecho sin cubrir la información principal de la terminal consultada ni interrumpir ping o herramientas remotas.
  - Barra de progreso interactiva (0% a 100%) con conteo de "Equipos activos detectados".
  - Lista dinámica y virtualizada de tarjetas/filas con: Hostname, IP, latencia (ms) y estado.
  - Botón de acción rápida en cada fila:
    - Clic en tarjeta: Consulta inmediata de la terminal en Portal Correo.
    - Botón VNC rápido: Lanzar conexión directa a esa IP.
  - Botón "Detener Escaneo" para cancelar en cualquier momento.

---

## Non-Functional Requirements & Performance
- **Zero UI Freezing:** El escaneo debe correr enteramente en el proceso Main o workers asíncronos sin congelar el hilo de renderizado de React ni afectar la latencia del monitor de Ping continuo.
- **Zero-Secrets Compliance:** Todas las pruebas unitarias y mocks deben cumplir estrictamente la auditoría Zero-Secrets (sin IPs corporativas reales ni hashes en git).
- **Consumo Controlado de Recursos:** Limitar la concurrencia de pings para no saturar switches o enlaces WAN de sucursales lentas.

---

## Acceptance Criteria
- [ ] Presionar `Ctrl + Espacio` en segundo plano trae la ventana al frente y enfoca el input.
- [ ] Si el portapapeles tiene un Hostname o IP válido, se auto-completa y busca de forma automática.
- [ ] El botón "Escanear Subred" dispara el escaneo del segmento `/24` de la IP de la terminal.
- [ ] Los equipos descubiertos aparecen progresivamente en el panel deslizable en tiempo real.
- [ ] El operador puede seguir consultando datos, ver el ping o usar herramientas de la terminal actual mientras corre el escáner.
- [ ] Clic en un equipo descubierto permite cargar su ficha o conectar por VNC.
- [ ] La suite de pruebas unitarias (`npm test`) cubre validadores de portapapeles, motor de escaneo y streaming IPC con 100% de éxito.
