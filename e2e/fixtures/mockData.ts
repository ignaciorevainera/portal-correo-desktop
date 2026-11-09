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
      type: 'warning',
      timestamp: '2026-11-09 09:30:00',
    },
  ],
  resetHistory: [
    {
      id: 'RST-01',
      requestedBy: 'operador.demo',
      date: '2026-11-01',
      status: 'completed',
    },
  ],
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
