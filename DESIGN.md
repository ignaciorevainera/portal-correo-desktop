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
`aria-label`, los `title` y el estilo de split (`rounded-r-none` /
`rounded-l-none border-l-0`) de cada ping se conservan.

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

Tampoco se admiten colores literales de paleta (`text-blue-600`,
`bg-emerald-500`, …) ni `z-50` manual fuera del baseline del contrato.

## Gates

Todo cambio de superficies, tokens o componentes debe pasar, con salida real:

- `npm test` — suite completa en verde.
- `npm run build` — TypeScript y bundle sin errores.
- `npm run audit:contrast` — contraste de tokens en verde.
- `node scripts/check-contrast.mjs --strict` — sin excepciones, exit 0.
- `npx vitest run src/test/designContract.test.ts` — ratchet en **0/0/0/4**
  (paleta fija, sombras propias, radios pelados y `z-index` manual). El ratchet
  sólo puede bajar: si un cambio sube cualquiera de esos conteos, no entra.

El contrato de diseño y el script de contraste no se relajan para acomodar un
cambio visual; se corrige el cambio.

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
