import { describe, it, expect, vi } from 'vitest';

const { createPingSessions } = require('../../electron/pingSessions.cjs');

function createSender(id: number) {
  const messages: Array<{ channel: string; payload: any }> = [];
  return {
    id,
    messages,
    isDestroyed: () => false,
    send: (channel: string, payload: any) => messages.push({ channel, payload }),
  };
}

function createHarness() {
  const procs: any[] = [];
  const executePing = vi.fn(
    (target: string, options: any, onData: any, onDone: any) => {
      const proc = { target, options, onData, onDone, kill: vi.fn() };
      procs.push(proc);
      return proc;
    },
  );
  const sessions = createPingSessions({
    executePing,
    logger: { warn: vi.fn() },
  });
  return { sessions, executePing, procs };
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

    sessions.stopAll();

    expect(procs.every((proc) => proc.kill.mock.calls.length === 1)).toBe(true);
    expect(sessions.count()).toBe(0);
  });

  it('no envía eventos a un sender destruido', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    a.isDestroyed = () => true;

    sessions.start(a, '192.0.2.1', true);
    procs[0].onData('x');
    procs[0].onDone(0);

    expect(a.messages).toEqual([]);
    expect(sessions.count()).toBe(0);
  });

  it('no deja sesión si executePing devuelve null', () => {
    const executePing = vi.fn(() => null);
    const sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);

    expect(sessions.has(a)).toBe(false);
  });
});
