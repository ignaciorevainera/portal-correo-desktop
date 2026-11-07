import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { LivePingConsole } from '../components/LivePingConsole';
import * as electronClient from '../services/electronClient';

describe('LivePingConsole Performance & Stable $O(1)$ Line Model', () => {
  it('assigns stable monotonic line ids and trims buffer to max 400 lines without shifting existing keys', () => {
    let emitPingOutput: ((text: string) => void) | null = null;

    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation(
      (_ip, onData) => {
        emitPingOutput = onData;
        return vi.fn();
      }
    );

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />
    );

    // Initial ping header is emitted: line 1
    const initialLines = document.querySelectorAll('[data-line-id]');
    expect(initialLines.length).toBeGreaterThanOrEqual(1);
    const firstLineId = initialLines[0].getAttribute('data-line-id');
    expect(firstLineId).toBeDefined();

    // Now emit 405 lines in batches
    act(() => {
      // 405 lines
      const batch1 = Array.from({ length: 405 }, (_, i) => `Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms TTL=128 (seq ${i + 1})\n`).join('');
      emitPingOutput?.(batch1);
    });

    const renderedLines = document.querySelectorAll('[data-line-id]');
    // Max buffer is 400 lines
    expect(renderedLines.length).toBe(400);

    // The oldest lines (including firstLineId) should have been pruned
    expect(document.querySelector(`[data-line-id="${firstLineId}"]`)).toBeNull();

    // The newest line should have data-line-id corresponding to the latest monotonic id
    const lastLine = renderedLines[renderedLines.length - 1];
    expect(Number(lastLine.getAttribute('data-line-id'))).toBeGreaterThanOrEqual(400);

    // Pre-classified tone classes: ping response has text-console-fg
    expect(lastLine.className).toContain('text-console-fg');
  });

  it('correctly classifies tone for errors, starting, and success upon line creation', () => {
    let emitPingOutput: ((text: string) => void) | null = null;
    let emitPingEnd: ((code: number) => void) | null = null;

    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation(
      (_ip, onData, onEnd) => {
        emitPingOutput = onData;
        emitPingEnd = onEnd;
        return vi.fn();
      }
    );

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      emitPingOutput?.('Error de transmisión. Código 1234.\nDestino inaccesible.\n');
      emitPingEnd?.(0);
    });

    const rendered = document.querySelectorAll('[data-line-id]');
    const errorLine = Array.from(rendered).find((el) => el.textContent?.includes('Error de transmisión'));
    const inaccesibleLine = Array.from(rendered).find((el) => el.textContent?.includes('inaccesible'));
    const successLine = Array.from(rendered).find((el) => el.textContent?.includes('finalizado'));

    expect(errorLine).toBeDefined();
    expect(errorLine?.className).toContain('text-console-destructive');

    expect(inaccesibleLine).toBeDefined();
    expect(inaccesibleLine?.className).toContain('text-console-destructive');

    expect(successLine).toBeDefined();
    expect(successLine?.className).toContain('text-console-success');
  });
});
