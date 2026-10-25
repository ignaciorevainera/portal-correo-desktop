# Specification: Empty State de Terminal Inexistente y Supresión de Auto-Scroll / Foco en Ping

## 1. Overview
Mejorar la experiencia de usuario (UX) en la consola resolviendo dos fricciones clave:
1. Al consultar un equipo inexistente, actualmente se muestra el mensaje inicial genérico ("Buscar una terminal para comenzar"). Se debe implementar un estado vacío específico ("Terminal no encontrada") que informe claramente el término buscado y guíe al operador.
2. Al ejecutar ping automático o manual, cada paquete/evento o acción sobre los logs dispara desplazamientos de pantalla o enfoque indeseados hacia la consola de ping (debido a `scrollIntoView`). Se debe remover completamente cualquier auto-scroll (tanto a nivel de página/contenedor como interno de logs) y evitar redirecciones de foco involuntarias al operador.

## 2. Requerimientos Funcionales
- **RF-01: Estado Vacío de Búsqueda Fallida (Terminal Not Found):**
  - Diferenciar entre el estado inicial (sin búsqueda previa) y el estado de búsqueda fallida (`notFoundTerm`).
  - Mostrar un componente visual con icono `SearchX` / `AlertCircle`, indicando el hostname o IP consultado (ej. `No se encontró la terminal "${query}"`).
  - Incluir mensaje de orientación técnica: verificar sintaxis, alcance de red corporativa o pertenencia al inventario.
  - Proveer botón o acción para limpiar búsqueda y volver al estado inicial.
- **RF-02: Preservación de Auto-Ping sin Desplazamiento ni Foco:**
  - Al encontrar una terminal existente, mantener el disparo automático de ping estándar (4 paquetes).
  - Eliminar cualquier llamada a `scrollIntoView` o foco forzado hacia la sección de terminal o consola de ping.
- **RF-03: Supresión Total de Auto-Scroll en Consola de Ping:**
  - Eliminar el `useEffect` con `scrollIntoView` en `LivePingConsole`.
  - No forzar auto-scroll por cada tick de recepción de datos de ping ni al finalizar el proceso.
  - Al limpiar logs (`handleClear`) o iniciar ping desde el botón CTA, no realizar ningún salto ni desplazamiento de scroll.
  - El desplazamiento dentro de la caja de logs de la consola será 100% manual por parte del operador cuando este lo requiera.

## 3. Requerimientos No Funcionales
- **RNF-01:** Compatibilidad visual estricta con Shadcn UI y Tailwind CSS v4 existentes.
- **RNF-02:** Tiempo de respuesta inmediato en el cambio de estados sin parpadeos.
- **RNF-03:** Pruebas unitarias actualizadas con Vitest que verifiquen el nuevo empty state y la ausencia de llamadas a `scrollIntoView`.

## 4. Criterios de Aceptación
- [ ] Búsqueda inicial muestra "Buscar una terminal para comenzar".
- [ ] Búsqueda con terminal inexistente muestra estado "No se encontró el equipo [query]".
- [ ] Búsqueda exitosa carga la terminal e inicia auto-ping sin mover la vista ni quitar foco del contexto actual del usuario.
- [ ] Durante el ping (estándar o -t), ningún paquete recibido causa saltos de scroll en la página ni dentro del componente.
- [ ] Botones "Iniciar", "Detener" y "Limpiar" ejecutan su acción sin alterar el desplazamiento vertical.
- [ ] Cobertura de pruebas unitarias > 80% en los componentes modificados.

## 5. Fuera de Alcance
- Modificaciones en los scripts del backend de Ping o base de datos SQL.
- Rediseño general del resto de los paneles (Hardware, Alertas, Uptime).
