# Specification: Accesibilidad Visual (Escala de Texto y Modo de Alto Contraste)

## Overview
En entornos operativos con pantallas y monitores corporativos de 24 pulgadas o tecnologías de panel básicas (TN/baja resolución), o para operadores con visibilidad reducida o necesidad de anteojos, la lectura de textos e indicadores técnicos puede resultar dificultosa.

Este track implementa una nueva sección de **Accesibilidad y Visualización** en el modal de Ajustes que permite:
1. **Control de Escala de Texto / Interfaz:** Selección de 4 niveles discretos (100% Estándar, 110% Mediano, 120% Grande, 130% Extra grande) con atajos de teclado estándar (`Ctrl + +`, `Ctrl + -`, `Ctrl + 0`).
2. **Switch de Modo de Alto Contraste:** Modo complementario activo sobre el tema actual (claro u oscuro) que intensifica los bordes haciéndolos nítidos y sólidos, oscurece o aclara fondos al extremo y elimina transparencias o tintes tenues, elevando el contraste a ratios WCAG AAA (>7:1).
3. **Persistencia Total:** Sincronización en `localStorage` y en `uiPreferences` del proceso Main de Electron para garantizar que las preferencias se restauren inmediatamente al iniciar la aplicación sin ningún parpadeo (FOUC).

---

## Functional Requirements

### FR-1: Sección "Accesibilidad y Visualización" en Ajustes (`SettingsModal.tsx`)
- Integrar una nueva sección visualmente diferenciada con ícono representativo.
- Disponer de un `ToggleGroup` para la escala de texto con 4 opciones: `100%` (Estándar), `110%` (Mediano), `120%` (Grande), `130%` (Extra grande).
- Disponer de un `Switch` accesible para el "Modo de Alto Contraste" con etiqueta y texto descriptivo de la funcionalidad.

### FR-2: Motor de Escalado Armónico y Atajos de Teclado
- Implementar el escalado a través del zoom factor en Electron (`webFrame.setZoomFactor`) y variables CSS base, garantizando que el diseño compacto (1020x680) escale simétricamente sin recortar botones, badges ni cuadros de diálogo.
- Soportar atajos estándar de teclado en la ventana:
  - `Ctrl + +` / `Ctrl + =`: Incrementar nivel de escala.
  - `Ctrl + -`: Disminuir nivel de escala.
  - `Ctrl + 0`: Restablecer a 100% Estándar.
- Sincronización bidireccional entre los atajos de teclado y el valor seleccionado en Ajustes.

### FR-3: Estilo y Clases de Alto Contraste (`.high-contrast`)
- Gestionar la inyección de la clase `.high-contrast` en el elemento raíz (`document.documentElement`).
- En `src/index.css`:
  - Reemplazar bordes con opacidades sutiles (`oklch(1 0 0 / 10%)`) por bordes nítidos y sólidos.
  - Reemplazar fondos tenues (`bg-muted/20`, `bg-card/40`) por fondos sólidos bien diferenciados.
  - Garantizar contraste óptimo (>7:1) para textos secundarios e informativos.
  - Reforzar los anillos de foco (`focus-visible`) para navegación clara por teclado.

### FR-4: Persistencia y Ciclo de Vida
- Extender `electron/uiPreferences.cjs` e IPC (`loadUiPreferences`, `saveUiPreferences`) con los campos:
  - `textScale: "100" | "110" | "120" | "130"` (por defecto `"100"`).
  - `highContrast: boolean` (por defecto `false`).
- En el arranque del Renderer, inicializar las preferencias inmediatamente para evitar saltos visuales durante la carga.

---

## Non-Functional Requirements
- **Rendimiento:** Cambio instantáneo sin demoras perceptibles ni recarga de ventana.
- **Calidad de Código y Accesibilidad:** Compatibilidad total con la suite de pruebas unitarias (`vitest`) y auditoría de contrastes (`scripts/check-contrast.mjs`). Cumplimiento de pautas WCAG 2.1 AA/AAA.

---

## Acceptance Criteria
1. El usuario puede acceder a Ajustes y ver la sección "Accesibilidad y Visualización".
2. Al cambiar la escala (100%, 110%, 120%, 130%), la interfaz escala de forma armónica e inmediata.
3. Al utilizar `Ctrl + +`, `Ctrl + -` y `Ctrl + 0`, la escala de la aplicación cambia y se sincroniza en Ajustes.
4. Al activar el switch de Alto Contraste, se aplica la clase `.high-contrast` y los bordes, textos y componentes adquieren máxima nitidez y contraste.
5. Las preferencias persisten tras reiniciar el aplicativo.
6. La suite de pruebas unitarias (`npm test`) y de verificación de release (`npm run release:check`) pasan al 100%.

---

## Out of Scope
- Modificación de la resolución de pantalla nativa del sistema operativo Windows.
- Incorporación de fuentes tipográficas externas no corporativas.
