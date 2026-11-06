import { describe, it, expect, vi } from 'vitest';

const { createPingSessions } = require('../../electron/pingSessions.cjs');

function createSender(id: number) {
  const messages: Array<{ channel: string; payload: any }> = [];
  const listeners: Record<string, Array<() => void>> = {};
  return {
    id,
    messages,
    isDestroyed: () => false,
    send: (channel: string, payload: any) => messages.push({ channel, payload }),
    once: (event: string, callback: () => void) => {
      (listeners[event] ||= []).push(callback);
    },
    emit: (event: string) => {
      const callbacks = listeners[event] || [];
      listeners[event] = [];
      callbacks.forEach((callback) => callback());
    },
  };
}

function createHarness() {
  const procs: any[] = [];
  const logger = { warn: vi.fn() };
  const executePing = vi.fn(
    (target: string, options: any, onData: any, onDone: any) => {
      const proc = { target, options, onData, onDone, kill: vi.fn() };
      procs.push(proc);
      return proc;
    },
  );
  const sessions = createPingSessions({ executePing, logger });
  return { sessions, executePing, procs, logger };
}

describe('pingSessions', () => {
  it('aísla los eventos por sender', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    const b = createSender(2);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(b, '192.0.2.2', true);
    procs[0].onData('a-1');
    procs[1].onData('b-1');

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'a-1' },
    ]);
    expect(b.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'b-1' },
    ]);
  });

  it('iniciar un ping nuevo de A mata solo el anterior de A', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    const b = createSender(2);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(b, '192.0.2.2', true);
    sessions.start(a, '192.0.2.3', true);

    expect(procs[0].kill).toHaveBeenCalledTimes(1);
    expect(procs[1].kill).not.toHaveBeenCalled();
    expect(procs[2].target).toBe('192.0.2.3');
  });

  it('un end viejo no emite después de reiniciar', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(a, '192.0.2.2', true);
    procs[0].onDone(0);

    expect(a.messages).toEqual([]);
  });

  it('detener A no toca B', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    const b = createSender(2);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(b, '192.0.2.2', true);

    expect(sessions.stop(a)).toBe(true);
    expect(procs[0].kill).toHaveBeenCalledTimes(1);
    expect(procs[1].kill).not.toHaveBeenCalled();
    expect(sessions.has(b)).toBe(true);
  });

  it('stopAll limpia todas las sesiones', () => {
    const { sessions, procs } = createHarness();
    sessions.start(createSender(1), '192.0.2.1', true);
    sessions.start(createSender(2), '192.0.2.2', true);

    expect(sessions.count()).toBe(2);
    sessions.stopAll();

    expect(procs).toHaveLength(2);
    expect(procs.every((proc) => proc.kill.mock.calls.length === 1)).toBe(true);
    expect(sessions.count()).toBe(0);
  });

  it('no inicia ping para un sender destruido', () => {
    const { sessions, executePing } = createHarness();
    const a = createSender(1);
    a.isDestroyed = () => true;

    expect(sessions.start(a, '192.0.2.1', true)).toBeNull();
    expect(executePing).not.toHaveBeenCalled();
    expect(sessions.count()).toBe(0);
  });

  it('no deja sesión y emite fin si executePing devuelve null', () => {
    const executePing = vi.fn(() => null);
    const sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'No se pudo iniciar ping.\n' },
      { channel: 'pcd:ping-end', payload: 1 },
    ]);
    expect(sessions.has(a)).toBe(false);
  });

  it('emite el fin al sender actual con su código', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);
    procs[0].onDone(0);

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-end', payload: 0 },
    ]);
    expect(sessions.has(a)).toBe(false);
  });

  it('ignora datos del proceso viejo tras reiniciar', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(a, '192.0.2.2', true);
    procs[0].onData('viejo');
    procs[1].onData('nuevo');

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'nuevo' },
    ]);
  });

  it('emite error y fin si executePing lanza', () => {
    const executePing = vi.fn(() => {
      throw new Error('boom');
    });
    const sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'Error al iniciar ping: boom\n' },
      { channel: 'pcd:ping-end', payload: 1 },
    ]);
    expect(sessions.has(a)).toBe(false);
  });

  it('no propaga errores si el sender falla al enviar', () => {
    const { sessions, procs, logger } = createHarness();
    const a = createSender(1);
    a.send = () => {
      throw new Error('destroyed');
    };

    sessions.start(a, '192.0.2.1', true);

    expect(() => procs[0].onData('x')).not.toThrow();
    expect(() => procs[0].onDone(0)).not.toThrow();
    expect(sessions.count()).toBe(0);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('detiene la sesión cuando el sender se destruye', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);
    a.isDestroyed = () => true;
    a.emit('destroyed');

    expect(procs[0].kill).toHaveBeenCalledTimes(1);
    expect(sessions.has(a)).toBe(false);
  });

  it('no envía eventos si el sender se destruye después de iniciar', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);
    a.isDestroyed = () => true;
    procs[0].onData('x');
    procs[0].onDone(0);

    expect(a.messages).toEqual([]);
    expect(sessions.count()).toBe(0);
  });

  it('mata el proceso si la sesión se detuvo durante executePing', () => {
    const procs: any[] = [];
    let sessions: any;
    const executePing = vi.fn(() => {
      sessions.stopAll();
      const proc = { kill: vi.fn() };
      procs.push(proc);
      return proc;
    });
    sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    expect(sessions.start(a, '192.0.2.1', true)).toBeNull();
    expect(procs[0].kill).toHaveBeenCalledTimes(1);
    expect(sessions.has(a)).toBe(false);
  });

  it('emite fin si executePing devuelve un proceso inválido', () => {
    const executePing = vi.fn(() => ({}));
    const sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'No se pudo iniciar ping.\n' },
      { channel: 'pcd:ping-end', payload: 1 },
    ]);
    expect(sessions.has(a)).toBe(false);
  });

  it('no duplica el fin si executePing ya cerró la sesión', () => {
    let sessions: any;
    const executePing = vi.fn((_target, _options, onData, onDone) => {
      onData('inicio');
      onDone(0);
      return null;
    });
    sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'inicio' },
      { channel: 'pcd:ping-end', payload: 0 },
    ]);
    expect(sessions.has(a)).toBe(false);
  });
});
