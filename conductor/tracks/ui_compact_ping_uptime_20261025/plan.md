# Implementation Plan: Compactación de Reseteo/Uptime, Iconos Consistentes y Rediseño de Consola de Ping Contigua

### Phase 1: Rediseño de Consola de Ping Contigua (Sin Título, 3 CTAs Exclusivos y Mayor Altura) [checkpoint: 0eccdb6]
- [x] Task: Escribir tests en `src/test/LivePingConsole.test.tsx` verificando la eliminación del título de consola, la presencia de los 3 CTAs en el header y la altura ampliada/estructura contigua sin paddings envolventes [08395fb]
- [x] Task: Refactorizar `LivePingConsole.tsx`: [0eccdb6]
  - Retirar `CardTitle` de texto redundante.
  - Diseñar la barra superior como contenedor de controles con IP/Badge y los 3 CTAs (`Iniciar/Detener`, `Limpiar`, `Copiar logs`).
  - Quitar el contenedor intermedio `CardContent`, renderizando la pantalla `#0C0C0C` directamente contigua debajo de la barra superior.
  - Aumentar la altura de la consola a `h-64` para mayor visibilidad del flujo de paquetes.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [0eccdb6]

### Phase 2: Compactación de Reseteo de Cuentas y Uptime con Iconos de Título Consistentes
- [ ] Task: Escribir tests para `ResetUptimePanel` validando el tamaño uniforme de iconos en títulos (`h-4 w-4`) y estructura compacta
- [ ] Task: Refactorizar `ResetUptimePanel.tsx` para optimizar el espacio vertical:
  - Consolidar en una card compacta o grilla integrada.
  - Normalizar todos los iconos de los títulos internos (`Clock`, `ShieldAlert`, etc.) a un tamaño estricto y alineación uniforme.
  - Optimizar el formulario de reset a una fila horizontal compacta con input y botón en línea.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3: Verificación Integral del Sistema y Build
- [ ] Task: Ejecutar la suite completa de tests automatizados (`npm test`) y verificar cero regresiones en los 25+ archivos de prueba
- [ ] Task: Ejecutar build de producción (`npm run build`) y relanzar Electron
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
