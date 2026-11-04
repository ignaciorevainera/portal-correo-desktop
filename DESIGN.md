# Estándares de diseño · Portal Correo Desktop

Este documento fija las reglas de interfaz del proyecto. Es la fuente de verdad
para las superficies de la aplicación (`src/App.tsx`, `src/components` y los
diálogos) y prevalece sobre las notas de ejecución de
`docs/ui-slop-audit-2026-11-02.md` cuando ambas difieren.

## Notificaciones y feedback

Los resultados de acciones asíncronas —asistencia remota VNC/MSRA, conexión
remota inteligente, refresco de uptime y reseteos— se comunican con **toasts de
sonner en la esquina inferior derecha**. Usar `description` cuando aporte
contexto (por ejemplo, el uptime obtenido o que MSRA está disponible) y `action`
cuando exista un camino alternativo, como «Conectar por MSRA» al fallar VNC.

No se usa un `Alert` inline debajo de la barra para resultados transitorios. El
`Alert` queda reservado para estados persistentes dentro de una página o
formulario, no para confirmar una acción que el operador acaba de disparar.

Un mismo resultado se comunica una sola vez: no se duplica el toast con un
mensaje inline equivalente.

## Barra de acciones

La barra mantiene siempre visibles la conexión remota inteligente (con su split
de opciones), el ping del equipo (con `-t`) y los pings a los enlaces del sitio
`.250` y `.231` (cada uno con `-t`). Las acciones secundarias —diagnóstico
`nbtstat`/`tracert`/`arp`, escanear subred y refrescar uptime— viven en el menú
«Más».

El motivo es operativo: los enlaces del sitio se consultan a diario y esconderlos
agrega un clic a una tarea frecuente. A anchos reducidos la fila envuelve con
`flex-wrap`; no se ocultan acciones primarias detrás de un menú. Los
`aria-label`, el `title` nativo y el estilo de split (`rounded-r-none` /
`rounded-l-none border-l-0`) de cada ping se conservan.

## Comportamiento automático

Al cargar una terminal se ejecuta un único ping automático al equipo buscado,
con el modo predeterminado de Ajustes (`pcd_pref_ping_mode`: estándar de 4
paquetes o `-t`). La preferencia se lee en cada carga, así que un cambio en
Ajustes aplica a la búsqueda siguiente sin recargar la ventana. No se encadenan
pings automáticos a `.250` ni `.231`: esos enlaces se disparan sólo desde la
barra.

El botón «Ping» y la tecla F4 siguen siendo siempre el ping estándar de 4
paquetes; el modo continuo tiene su propio botón `-t`.

## Secciones de `<main>`

Las tres secciones del contenido —Datos del equipo, consola y Alertas y
reseteos— comparten un único chrome: la `Card` del preset (`bg-card`,
`ring-1 ring-foreground/10`, `rounded-xl`, `shadow-xs`) con cabecera interna
`border-b border-border` y gutter `px-3 py-2.5`. El cuerpo de la consola usa
`p-3` y la tabla de alertas alinea su primera y última celda a 12 px. El chrome
no se sobrescribe con `bg-*`, `border`, `rounded` ni `shadow-*` propios; un
tinte de estado va adentro, como contenido. Toda sección nueva de `<main>` se
envuelve en `Card` con este tratamiento.

El margen lateral de la ventana es uno solo: **14 px** (`px-3.5` en la Topbar y
en la barra de acciones, `p-3.5` en `<main>`). Las tres superficies arrancan en
la misma coordenada.

## Consola

La consola arranca abierta y se puede colapsar desde su encabezado. El colapso
manual se respeta; una acción posterior del operador (un ping, un diagnóstico o
una señal de apertura) la vuelve a abrir. Los controles de la cabecera —
Detener, Limpiar, Copiar Último y Copiar Logs— siguen visibles aunque esté
colapsada.

El viewport del log es oscuro en ambos temas: usa los tokens fijos `--console-*`
(`bg-console-bg`, `text-console-fg`, `--console-success/warning/info/destructive`)
sin variante `.dark`. El cromo de la consola (cabecera, bordes y acciones) sigue
al tema como el resto de la aplicación.

## Color y elevación

Sólo se usan tokens semánticos (`bg-background`, `text-foreground`,
`text-muted-foreground`, `border-border`, `text-success`, `text-warning`,
`text-info`, `text-destructive`). El texto de acento usa `--link` a través de
`text-link`; `text-primary` no se usa como color de texto. El log usa
exclusivamente `--console-*`.

Los radios salen del preset (`rounded-md`, `rounded-lg`, `rounded-full`, etc.):
no se usa `rounded` pelado ni radios arbitrarios `rounded-[…]`. No se agregan
sombras propias (`shadow-*`) ni degradados (`bg-gradient-*`); las sombras y
radios de `src/components/ui/**` quedan tal como llegaron de la primitiva.

Los tokens semánticos son los del preset corporativo. La app no los oscurece
para AA: los pares de texto sobre tintes quedan entre 3.64:1 y 4.34:1 y están
documentados como excepciones medidas en `scripts/check-contrast.mjs`. `--info`
se conserva como semántica de diagnóstico. Los bordes son decorativos: el script
los reporta como «decorativo» y no bloquean el exit.

Tampoco se admiten colores literales de paleta (`text-blue-600`,
`bg-emerald-500`, …) ni `z-50` manual fuera del baseline del contrato.

En la Topbar, el atajo Portal MDA usa texto neutro (`text-muted-foreground` con
`hover:text-foreground`), igual que el resto de botones de su grupo: sin acento
de enlace.

## Tipografía

Cuatro pasos, sin tamaños arbitrarios: **18** (`text-lg`, títulos), **14**
(`text-sm`, cuerpo), **12** (`text-xs`, metadatos) y **11** (`text-micro`, piso
para chips, ayudas y códigos). No se usa `text-[Npx]`; el contrato lo prohíbe.

Las etiquetas de sección usan `overline-label` (11 px, mayúsculas, tracking
corto) y hay como máximo **cinco** en toda la app. Los iconos de sección van en
`IconWell` (`sm`/`md`), no en `div` con tinte escrito a mano.

Las primitivas de `src/components/ui/**` conservan sus tamaños internos, salvo
`Kbd`, alineado al piso de 11 px. Cuando una primitiva renderiza un título fuera
de escala, se ajusta el consumidor (por ejemplo `DialogTitle` con `text-lg`).

## Ayuda contextual

Los controles interactivos usan `title` nativo. El `aria-label` es el nombre
accesible y el `title` sólo agrega una frase de ayuda, sin capas, sin animación y
sin bloquear el puntero.

Se probó una capa de tooltips (`Hint` sobre Radix `Tooltip`) y se descartó: no
reemplazaba al `aria-label`, pero agregaba animación y ruido a controles que no la
necesitan, y el contenido flotante interfería con el clic en otras secciones.

La infraestructura de tooltips se retiró por completo: no hay `TooltipProvider`,
ni `src/components/ui/tooltip.tsx`, ni consumidores.

Los `title` de superficies informativas (chip de uptime, badge de conexión) se
conservan.

## Overlays y controles

- **Buscador**: `InputGroup` + `Popover` + `Command`. El input vive en la barra
  superior, el panel se ancla con `PopoverAnchor` y no roba foco; las filas son
  `CommandItem` (rol `option`) y las acciones por fila son botones hermanos,
  nunca hijos de la opción. El `Command` se remonta por consulta (`key={query}`)
  para que cmdk no auto-seleccione al filtrar. Cada fila muestra sólo el valor y
  un icono; no se etiqueta el tipo de resultado. El panel no anima la entrada
  (`data-open:animate-none`). El panel sólo se renderiza cuando hay
  coincidencias: al filtrar no hay encabezado ni conteo, y sin coincidencias no
  aparece leyenda ni estado vacío. Al vaciar la consulta vuelve el encabezado
  «Búsquedas recientes».
- **Menú contextual**: `ContextMenu` anclado a `<main>`, no al documento, para
  que el buscador y los inputs conserven el menú nativo. El trigger lleva
  `select-text` porque Radix agrega `select-none` y el operador necesita
  seleccionar y copiar texto. El menú lleva `aria-label="Acciones del operador"`
  para tener nombre accesible además del label visible, y Radix resuelve flechas,
  Escape y foco.
- **Drawer**: `Sheet` con `SheetTitle` y `SheetDescription` obligatorios. Las
  barras de progreso son `Progress` con `aria-valuenow`, nunca un `div` con
  `style={{ width }}`.
- **Diálogos destructivos**: `AlertDialog`. La acción que valida un formulario
  usa un `Button` propio (no `AlertDialogAction`), porque Radix cierra antes de
  validar.
- **Booleanos de configuración**: `Switch` con `aria-label`; **sets de 2–7
  opciones**: `ToggleGroup` con estado seleccionado visible
  (`data-[state=on]:bg-primary`), no botones con `variant` manual.

## Gates

Todo cambio de superficies, tokens o componentes debe pasar, con salida real:

- `npm test` — suite completa en verde.
- `npm run build` — TypeScript y bundle sin errores.
- `npm run audit:contrast` — contraste de tokens con las excepciones documentadas.
- `node scripts/check-contrast.mjs` — exit 0 con las excepciones medidas.
  `--strict` es diagnóstico: ignora las excepciones y falla a propósito con los
  pares aceptados de tintes.
- `npx vitest run src/test/designContract.test.ts` — ratchet en **0/0/0/1**
  (paleta fija, sombras propias, radios pelados y `z-index` manual). El ratchet
  sólo puede bajar: si un cambio sube cualquiera de esos conteos, no entra.

El ratchet de diseño no se relaja para acomodar un cambio visual: se corrige el
cambio. El contraste AA sobre tintes es la única excepción documentada, por
decisión de producto (2026-11-04).

## Decisiones revisadas

Estas tres reversiones se probaron en producto y se descartaron por su efecto en
el flujo del operador:

1. **Feedback inline → toasts.** El `Alert` debajo de la barra para resultados
   transitorios se probó y no resultó óptimo: competía con la barra, persistía
   más de lo deseado y obligaba a mirar fuera del punto de acción. Se restauran
   los toasts de sonner en la esquina inferior derecha.
2. **Barra de dos acciones → enlaces del sitio visibles.** Esconder `.250` y
   `.231` en «Más» agregaba un clic a una consulta diaria. Vuelven a la fila
   visible, conservando el menú «Más» sólo para las acciones secundarias.
3. **Consola cerrada → consola abierta.** Arrancar colapsada obligaba a abrirla
   después de cada búsqueda y ocultaba el resultado del ping automático. Arranca
   abierta y sigue siendo colapsable desde el encabezado.
