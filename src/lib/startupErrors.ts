import type { GateStatusCode } from "../services/electronClient";

export interface StartupErrorContent {
  title: string;
  description: string;
  steps: string[];
}

type VisibleCode = Exclude<GateStatusCode, "AUTHORIZED">;

const UNKNOWN_CONTENT: StartupErrorContent = {
  title: "No pudimos verificar el acceso",
  description:
    "Ocurrió un problema al comprobar la configuración corporativa y no pudimos identificar la causa.",
  steps: [
    "Esperá unos segundos y elegí Reintentar.",
    "Verificá que estés conectado a la red corporativa o a la VPN.",
    "Si el problema continúa, contactá a soporte técnico e informá el código de referencia que aparece abajo.",
  ],
};

export const STARTUP_ERRORS: Record<VisibleCode, StartupErrorContent> & {
  AUTHORIZED: StartupErrorContent;
  UNKNOWN: StartupErrorContent;
} = {
  AUTHORIZED: { title: "Acceso verificado", description: "", steps: [] },
  NO_LAN_DNS: {
    title: "No pudimos ubicar el servidor de configuración",
    description:
      "Tu equipo no pudo ubicar el servidor que entrega la configuración de la aplicación. Esto suele ocurrir cuando no estás conectado a la red interna.",
    steps: [
      "Conectate al cable o al Wi-Fi de la red corporativa.",
      "Si trabajás en forma remota, activá la VPN corporativa.",
      "Esperá unos segundos y elegí Reintentar.",
      "Si el problema continúa, contactá a soporte técnico.",
    ],
  },
  NO_LAN_ROUTE: {
    title: "Sin acceso a la red corporativa",
    description:
      "La aplicación necesita la red interna para validar el acceso y no pudo llegar al servidor de configuración.",
    steps: [
      "Conectate al cable o al Wi-Fi de la red corporativa.",
      "Si trabajás en forma remota, activá la VPN corporativa.",
      "Elegí Reintentar para volver a comprobar el acceso.",
      "Si sigue bloqueado, avisá a soporte técnico.",
    ],
  },
  NO_LAN_TIMEOUT: {
    title: "La red corporativa no respondió",
    description:
      "La conexión con el servidor de configuración tardó demasiado. Puede ser una caída momentánea de la red o de la VPN.",
    steps: [
      "Esperá unos segundos y elegí Reintentar.",
      "Revisá que la conexión de red o la VPN sigan activas.",
      "Si se repite, contactá a soporte técnico.",
    ],
  },
  NO_PERMISSION: {
    title: "Tu usuario no tiene acceso a la configuración",
    description:
      "Estás en la red corporativa, pero la cuenta de Windows con la que iniciaste sesión no puede leer la configuración de la aplicación.",
    steps: [
      "Revisá que hayas iniciado sesión con tu cuenta corporativa.",
      "Cerrá y volvé a abrir la aplicación para que vuelva a validar el acceso.",
      "Si el acceso sigue denegado, pedile a soporte que habilite la lectura para tu usuario.",
    ],
  },
  NO_CONFIG: {
    title: "Falta la configuración corporativa",
    description:
      "No encontramos la configuración que la aplicación necesita para iniciar. Puede que todavía no esté publicada o que no sea visible desde este equipo.",
    steps: [
      "Conectate a la red corporativa y elegí Reintentar.",
      "Si ya estás en la red, avisá a soporte que la configuración no está disponible.",
      "No copies ni edites archivos de configuración por tu cuenta.",
    ],
  },
  BAD_CONFIG: {
    title: "La configuración corporativa tiene un problema",
    description:
      "La configuración existe, pero está incompleta o dañada, así que la aplicación no puede usarla.",
    steps: [
      "Elegí Reintentar por si la configuración se actualizó mientras tanto.",
      "Si el problema continúa, contactá a soporte e informá el código de referencia que aparece abajo.",
      "No modifiques archivos de configuración por tu cuenta.",
    ],
  },
  UNKNOWN: UNKNOWN_CONTENT,
};

export function getStartupErrorContent(code: {
  code?: GateStatusCode | string;
}): StartupErrorContent {
  const key = String(code.code || "UNKNOWN");
  if (!Object.hasOwn(STARTUP_ERRORS, key) || key === "AUTHORIZED") {
    return UNKNOWN_CONTENT;
  }
  return STARTUP_ERRORS[key as keyof typeof STARTUP_ERRORS];
}

export function getSupportCode(code?: string | null): string {
  const value = String(code || "").trim();
  return /^[A-Z_]{1,32}$/.test(value) ? value : "DESCONOCIDO";
}
