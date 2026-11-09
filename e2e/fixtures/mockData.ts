/**
 * Fixtures deterministas para pruebas E2E con Playwright.
 */
export const MOCK_TERMINAL_DEMO = {
  pc: 'PC-DEMO-001',
  ip: '192.0.2.101',
  mac: '00:1A:2B:3C:4D:5E',
  os: 'Windows 11 Enterprise',
  servicePack: '23H2',
  cpuModel: 'Intel Core i7-12700 @ 2.10GHz',
  ram: '16 GB',
  antivirusVersion: 'Defender 4.18.24080.9',
  ieVersion: '11.0.22621.1',
  userNt: 'CORREO\\operador.demo',
  architecture: '64-bit',
  surveyDate: '2026-11-09 10:00:00',
  uptimeText: '5d 14h 22m',
  location: 'Edificio Central - Piso 3',
  costCenter: 'Soporte Técnico',
  alerts: [
    {
      id: 'ALT-101',
      title: 'Espacio en disco bajo en C:',
      description: 'Menos del 10% disponible',
      operator: 'operador.demo',
      date: '2026-11-09 09:30:00',
      active: true,
    },
  ],
  resetHistory: [
    {
      id: 'RST-01',
      operator: 'operador.demo',
      date: '2026-11-01 14:00:00',
      reason: 'Reinicio programado',
      result: 'Completado OK',
    },
  ],
};

export const MOCK_TERMINALS = [
  MOCK_TERMINAL_DEMO,
  {
    pc: 'PC-DEMO-002',
    ip: '192.0.2.102',
    mac: '00:1A:2B:3C:4D:5F',
    os: 'Windows 10 Pro',
    servicePack: '22H2',
    cpuModel: 'Intel Core i5-11400 @ 2.60GHz',
    ram: '8 GB',
    antivirusVersion: 'Defender 4.18.24080.9',
    ieVersion: '11.0.19041.1',
    userNt: 'CORREO\\operador.sucursal',
    architecture: '64-bit',
    surveyDate: '2026-11-09 11:00:00',
    uptimeText: '2d 08h 15m',
    location: 'Sucursal Retiro - Box 4',
    costCenter: 'Operaciones',
    alerts: [],
    resetHistory: [],
  },
];

export const MOCK_GATE_STATUS = {
  status: 'READY' as const,
  code: 'AUTHORIZED' as const,
  message: 'Conexión corporativa validada y activa',
  source: 'unc' as const,
  configPath: '\\\\DEMO.INTERNAL\\netlogon\\portal\\config.json',
};

export const MOCK_SUBNET_HOSTS = [
  { ip: '192.0.2.1', hostname: 'ROUTER-GW-01', alive: true, responseTime: 2 },
  { ip: '192.0.2.101', hostname: 'PC-DEMO-001', alive: true, responseTime: 5 },
  { ip: '192.0.2.102', hostname: 'PC-DEMO-002', alive: true, responseTime: 7 },
  { ip: '192.0.2.231', hostname: 'SRV-TX-001', alive: true, responseTime: 3 },
  { ip: '192.0.2.250', hostname: 'ROUTER-SITE-250', alive: true, responseTime: 4 },
];

export const MOCK_PING_LINES = [
  'Haciendo ping a 192.0.2.101 con 32 bytes de datos:',
  'Respuesta desde 192.0.2.101: bytes=32 tiempo=4ms TTL=128',
  'Respuesta desde 192.0.2.101: bytes=32 tiempo=3ms TTL=128',
  'Respuesta desde 192.0.2.101: bytes=32 tiempo=5ms TTL=128',
  'Respuesta desde 192.0.2.101: bytes=32 tiempo=4ms TTL=128',
  'Estadísticas de ping para 192.0.2.101:',
  '    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% perdidos),',
  'Tiempos aproximados de ida y vuelta en milisegundos:',
  '    Mínimo = 3ms, Máximo = 5ms, Media = 4ms',
];
