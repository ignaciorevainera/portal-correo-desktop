import { describe, it, expect } from 'vitest';
import {
  findTerminalByQuery,
  getAllTerminals,
  addAlertToTerminal,
  closeAlertOnTerminal,
} from './terminalService';

describe('terminalService Synthetic Mock Repository', () => {
  it('retrieves all synthetic mock terminals', () => {
    const terminals = getAllTerminals();
    expect(terminals.length).toBeGreaterThanOrEqual(3);
  });

  it('finds terminal by hostname case-insensitively', () => {
    const term = findTerminalByQuery('ws-demo-002');
    expect(term).toBeDefined();
    expect(term?.pc).toBe('WS-DEMO-002');
    expect(term?.ip).toBe('192.0.2.102');
  });

  it('finds terminal by exact IP address', () => {
    const term = findTerminalByQuery('192.0.2.103');
    expect(term).toBeDefined();
    expect(term?.pc).toBe('TERM-DEMO-003');
    expect(term?.userNt).toBe('operadordemo04');
  });

  it('finds terminal by partial hostname or IP query', () => {
    const term = findTerminalByQuery('PC-DEMO');
    expect(term).toBeDefined();
    expect(term?.pc).toBe('PC-DEMO-001');
  });

  it('returns null for unknown query', () => {
    const term = findTerminalByQuery('nonexistent-pc-999');
    expect(term).toBeNull();
  });

  it('allows adding and closing alerts on a terminal', () => {
    const term = findTerminalByQuery('PC-DEMO-001');
    expect(term).toBeDefined();
    if (!term) return;

    const initialAlertsCount = term.alerts.length;
    const newAlert = addAlertToTerminal(term.pc, {
      title: 'Prueba de Alerta',
      description: 'Verificación de disco',
      operator: 'OperadorTest',
    });

    expect(newAlert.id).toBeDefined();
    const updatedTerm = findTerminalByQuery(term.pc);
    expect(updatedTerm?.alerts.length).toBe(initialAlertsCount + 1);

    const closed = closeAlertOnTerminal(term.pc, newAlert.id, 'Resuelto con éxito');
    expect(closed).toBe(true);

    const finalTerm = findTerminalByQuery(term.pc);
    const targetAlert = finalTerm?.alerts.find((a) => a.id === newAlert.id);
    expect(targetAlert?.active).toBe(false);
    expect(targetAlert?.resolutionText).toBe('Resuelto con éxito');
  });
});
