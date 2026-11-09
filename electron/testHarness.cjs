/**
 * Test Harness para ejecución E2E determinista en Electron.
 * Se activa si PCD_E2E_MODE === 'mock' o el flag CLI --e2e-mock está presente.
 */

const isMockMode =
  String(process.env.PCD_E2E_MODE || '').toLowerCase() === 'mock' ||
  process.argv.includes('--e2e-mock');

const MOCK_TERMINAL_DATA = {
  pc: 'PC-DEMO-001',
  ip: '192.0.2.101',
  Macadrress: '00:1A:2B:3C:4D:5E',
  Sist_operativo: 'Windows 11 Enterprise',
  ServPack: '23H2',
  ModeloYprocesador: 'Intel Core i7-12700 @ 2.10GHz',
  ram: '16 GB',
  version_AV: 'Defender 4.18.24080.9',
  IE: '11.0.22621.1',
  userNt: 'CORREO\\operador.demo',
  Arquitectura: '64-bit',
  Fecha_Relevada: '2026-11-09 10:00:00',
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

function getMockGateState() {
  return {
    status: 'READY',
    code: 'AUTHORIZED',
    message: 'Test Harness: Gate autorizado en modo E2E mock',
    source: 'e2e-harness',
    configPath: 'memory://e2e-mock',
    environment: {
      detectedDomain: 'DEMO.INTERNAL',
      isDomainJoined: true,
      note: 'Modo E2E mock activo',
    },
  };
}

function getMockTerminal(query) {
  const q = String(query || '').trim().toUpperCase();
  if (q.includes('DEMO') || q.includes('192.0.2.101') || q.includes('001') || q.length > 0) {
    return {
      ...MOCK_TERMINAL_DATA,
      pc: q.startsWith('192.') ? 'PC-DEMO-001' : (q || 'PC-DEMO-001'),
      ip: q.startsWith('192.') ? q : '192.0.2.101',
    };
  }
  return null;
}

module.exports = {
  isMockMode,
  getMockGateState,
  getMockTerminal,
};
