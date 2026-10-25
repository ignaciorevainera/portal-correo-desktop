import { TerminalData, TerminalAlert } from '../types/terminal';

let mockTerminals: TerminalData[] = [
  {
    pc: 'PC-DEMO-001',
    ip: '192.0.2.101',
    mac: '00:00:5E:00:53:01',
    os: 'Windows 10 Pro',
    servicePack: '19045.4046',
    cpuModel: 'Intel Core i5 ~2400 Mhz (Synthetic Test Unit)',
    ram: '8.192 MB (~8 GB)',
    antivirusVersion: 'Endpoint Protection 12.0',
    ieVersion: '11.0.19041.1',
    userNt: 'operador.demo01 | operador.demo02',
    architecture: 'x64-based PC',
    surveyDate: '01/01/2026',
    uptimeText: '12 day(s), 4 hour(s), 18 minute(s)',
    location: 'Sede Central Demo - Puesto Operativo 01',
    costCenter: 'CC 0001 - Entorno de Pruebas',
    alerts: [],
    resetHistory: [
      {
        id: 'rst-1',
        date: '14/05/2026 10:30',
        operator: 'admin.soporte',
        reason: 'Desbloqueo de clave de operador',
        result: 'Reset: OK / Cuenta Activa',
      },
    ],
  },
  {
    pc: 'WS-DEMO-002',
    ip: '192.0.2.102',
    mac: '00:00:5E:00:53:02',
    os: 'Windows 10 Pro (Build 19045)',
    servicePack: '19045.4046',
    cpuModel: 'GenuineIntel Core i3 ~3000 Mhz',
    ram: '4.096 MB (~4 GB)',
    antivirusVersion: 'Endpoint Protection 12.0',
    ieVersion: '11.0.19041.1',
    userNt: 'operador.demo03',
    architecture: 'x64-based PC',
    surveyDate: '02/01/2026',
    uptimeText: '5 day(s), 11 hour(s), 42 minute(s)',
    location: 'Sucursal Demo Norte',
    costCenter: 'CC 0002 - Atención Demo',
    alerts: [
      {
        id: 'alt-1',
        title: 'Mantenimiento Preventivo Pendiente',
        description: 'Requiere actualización de firma de antivirus y comprobación de disco.',
        operator: 'soporte.demo',
        date: '10/10/2026 09:15',
        active: true,
      },
    ],
    resetHistory: [],
  },
  {
    pc: 'TERM-DEMO-003',
    ip: '192.0.2.103',
    mac: '00:00:5E:00:53:03',
    os: 'Windows 11 Pro 64-bit',
    servicePack: '22631.3007',
    cpuModel: 'Intel64 Family 6 ~3200 Mhz',
    ram: '16.384 MB (~16 GB)',
    antivirusVersion: 'Endpoint Protection 12.0',
    ieVersion: '11.0.22621.1',
    userNt: 'operador.demo04',
    architecture: 'x64-based PC',
    surveyDate: '03/01/2026',
    uptimeText: '22 day(s), 1 hour(s), 09 minute(s)',
    location: 'Centro Logístico Demo',
    costCenter: 'CC 0003 - Operaciones Demo',
    alerts: [],
    resetHistory: [
      {
        id: 'rst-2',
        date: '20/08/2026 16:40',
        operator: 'admin.soporte',
        reason: 'Recambio de perfil de usuario',
        result: 'Reset: OK',
      },
    ],
  },
];

export function getAllTerminals(): TerminalData[] {
  return [...mockTerminals];
}

export function findTerminalByQuery(query: string): TerminalData | null {
  if (!query || !query.trim()) return null;
  const clean = query.trim().toLowerCase();

  const found = mockTerminals.find((t) => {
    const pcMatch = t.pc.toLowerCase().includes(clean);
    const ipMatch = t.ip.includes(clean);
    return pcMatch || ipMatch;
  });

  return found ? { ...found } : null;
}

export function addAlertToTerminal(
  pc: string,
  alert: { title: string; description: string; operator: string }
): TerminalAlert {
  const term = mockTerminals.find((t) => t.pc.toLowerCase() === pc.toLowerCase());
  if (!term) throw new Error(`Terminal ${pc} no encontrada`);

  const newAlert: TerminalAlert = {
    id: `alt-${Date.now()}`,
    title: alert.title,
    description: alert.description,
    operator: alert.operator,
    date: new Date().toLocaleString('es-AR'),
    active: true,
  };

  term.alerts = [newAlert, ...term.alerts];
  return newAlert;
}

export function closeAlertOnTerminal(
  pc: string,
  alertId: string,
  resolutionText: string
): boolean {
  const term = mockTerminals.find((t) => t.pc.toLowerCase() === pc.toLowerCase());
  if (!term) return false;

  const alert = term.alerts.find((a) => a.id === alertId);
  if (!alert) return false;

  alert.active = false;
  alert.resolutionText = resolutionText;
  alert.resolutionDate = new Date().toLocaleString('es-AR');
  return true;
}
