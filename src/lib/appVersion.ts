import { version } from "../../package.json";

/**
 * Versión de la aplicación. `package.json` es la única fuente: electron-builder
 * nombra los artefactos con ese valor y `app.getVersion()` devuelve lo mismo,
 * así que la UI no debe repetir el número.
 */
export const APP_VERSION: string = version;

/** Versión con prefijo `v`, para las etiquetas de la interfaz. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
