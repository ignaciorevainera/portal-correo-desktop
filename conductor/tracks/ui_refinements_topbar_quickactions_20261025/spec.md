# Specification: UI/UX Refinements, QuickActionsBar Minimalista, Topbar Expandida y Estado Inicial Limpio

## 1. Overview
Este track optimiza la experiencia de usuario de **Portal Correo Desktop**, refinando la barra de acciones rápidas (`QuickActionsBar`), ampliando ergonómicamente la barra superior (`Topbar`), eliminando el auto-disparo de ping y auto-scroll no deseados, asegurando que la carga inicial de la aplicación presente un estado vacío limpio (sin precarga de datos demo ni botones residuales de prueba) y garantizando que el contenedor principal (`<main>`) permanezca en la parte superior (`scrollTop: 0`) al seleccionar una terminal.

## 2. Requerimientos Funcionales
1. **QuickActionsBar Minimalista & Sin Card Contenedora:**
   - Desmantelar la estructura de `<Card>`, `<CardHeader>` y `<CardTitle>`.
   - Colocar los botones directamente en el contenedor horizontal flexible, con alineación compacta.
   - Mostrar únicamente los botones de acción (`VNC Viewer`, `Asistencia MSRA`, grupo `Ping`/`Ping -t`, y métrica de `Uptime`), sin títulos adicionales redundantes.
   - En el badge/alert de feedback de acciones: corregir la alineación vertical del icono/emoji y texto usando primitivas de shadcn con flex centrado (`inline-flex items-center gap-1.5`).
2. **Estado Inicial Limpio (Zero Preload / Zero Demo Buttons):**
   - Al iniciar la aplicación de 0, `selectedPc` y `terminal` deben iniciar vacíos (`null` o `""`).
   - Si no hay terminal seleccionada:
     - No renderizar la `QuickActionsBar`.
     - No ejecutar ningún ping en segundo plano.
     - En el `<main>`, renderizar un componente de bienvenida limpio indicando buscar una terminal en la barra superior (ej. ícono de búsqueda, título claro y descripción orientativa), sin botones con datos demo o mocks de ejemplo.
   - Estandarizar/limpiar textos residuales de prueba o demo en la UI.
3. **Control Estricto de Ping & Desplazamiento (`Scroll`):**
   - Ningún tic o paquete de ping debe desplazar la ventana principal (`<main>`). El auto-scroll de logs debe limitarse estrictamente al interior del área scrolleable de la consola `LivePingConsole`.
   - Al buscar o seleccionar una terminal, el `<main>` debe resetear su posición de desplazamiento a la parte superior (`scrollTop = 0`).
4. **Topbar Expandida (`h-14` / 56px) & Normalización de Acciones:**
   - Incrementar la altura del navbar superior a `h-14` (56px) para mejorar el espacio y legibilidad.
   - Aumentar proporcionalmente sus componentes internos: buscador central con input `h-10`, texto legible, icono de búsqueda centrado y atajo de teclado alineado.
   - Normalizar los botones y llamadas a la acción (CTAs) de la barra superior para que compartan estilo y altura uniforme (`h-10` / tamaño estándar de botón).
   - Asegurar contraste óptimo en modo oscuro y claro para el botón **Portal MDA** utilizando la paleta de shadcn.

## 3. Criterios de Aceptación
- Al arrancar la app, no se dispara ping ni se carga terminal alguna hasta que el usuario la busca activamente.
- Al seleccionar una terminal, la vista principal muestra los datos posicionada en el tope superior (`scrollTop: 0`).
- La ejecución del ping no desplaza el `<main>` mientras el operador navega o consulta tarjetas técnicas.
- La barra superior mide 56px (`h-14`) con input y botones en `h-10`.
- El botón de Portal MDA tiene contraste accesible tanto en modo claro como en modo oscuro.
- Todos los tests automatizados (unitarios y de integración) pasan al 100%.
