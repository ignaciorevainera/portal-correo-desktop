import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonitorWindow } from './MonitorWindow';

function createApi() {
  let dataCallback: (text: string) => void = () => {};
  let endCallback: (code: number | null) => void = () => {};
  const unsubData = vi.fn();
  const unsubEnd = vi.fn();

  return {
    getContext: vi.fn().mockResolvedValue({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
      pinned: true,
    }),
    startPing: vi.fn(),
    stopPing: vi.fn().mockResolvedValue(true),
    onPingData: vi.fn((callback: (text: string) => void) => {
      dataCallback = callback;
      return unsubData;
    }),
    onPingEnd: vi.fn((callback: (code: number | null) => void) => {
      endCallback = callback;
      return unsubEnd;
    }),
    setPinned: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    copyText: vi.fn().mockResolvedValue(true),
    connectRemote: vi.fn().mockResolvedValue({
      success: true,
      methodUsed: 'vnc',
      message: 'VNC iniciado',
    }),
    emitData: (text: string) => dataCallback(text),
    emitEnd: (code: number | null) => endCallback(code),
    unsubData,
    unsubEnd,
  };
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe('MonitorWindow', () => {
  let api: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    api = createApi();
    (window as any).monitorAPI = api;
  });

  it('renderiza el target e inicia el ping al montar', async () => {
    render(<MonitorWindow />);

    expect(
      await screen.findByText('WS-CORP-100 · 192.0.2.100'),
    ).toBeInTheDocument();
    expect(api.startPing).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('> ping -t 192.0.2.100'),
    ).toBeInTheDocument();
  });

  it('agrega líneas y respeta el tope de 500', async () => {
    const { container } = render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    act(() => {
      api.emitData(
        `${Array.from({ length: 600 }, (_, index) => `línea ${index}`).join(
          '\n',
        )}\n`,
      );
    });
    await flushFrame();

    await waitFor(() =>
      expect(screen.getByText('línea 599')).toBeInTheDocument(),
    );
    const log = container.querySelector('[role="log"]')!;
    expect(log.children.length).toBe(500);
  });

  it('detiene y reinicia el ping', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(screen.getByRole('button', { name: 'Detener ping' }));
    expect(api.stopPing).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Reiniciar ping' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar ping' }));
    expect(api.startPing).toHaveBeenCalledTimes(2);
  });

  it('alterna el pin', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(
      screen.getByRole('button', { name: 'Dejar de mantener visible' }),
    );
    expect(api.setPinned).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole('button', { name: 'Mantener visible' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('copia los logs y muestra el estado', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');
    act(() => api.emitData('Respuesta desde 192.0.2.100\n'));
    await flushFrame();
    await screen.findByText('Respuesta desde 192.0.2.100');

    fireEvent.click(
      screen.getByRole('button', { name: 'Copiar logs del monitor' }),
    );

    await waitFor(() => expect(api.copyText).toHaveBeenCalled());
    expect(await screen.findByText('Logs copiados')).toBeInTheDocument();
  });

  it('conecta remotamente con spinner y se rehabilita', async () => {
    let resolveRemote: (value: any) => void = () => {};
    api.connectRemote.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemote = resolve;
        }),
    );
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(
      screen.getByRole('button', { name: 'Conectar remotamente' }),
    );
    expect(api.connectRemote).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Conectando remotamente…' }),
    ).toBeDisabled();

    await act(async () => {
      resolveRemote({ success: true, methodUsed: 'vnc' });
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Conectar remotamente' }),
      ).toBeEnabled(),
    );
  });

  it('cierra la ventana', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar monitor' }));
    expect(api.close).toHaveBeenCalledTimes(1);
  });

  it('muestra error si no hay contexto', async () => {
    api.getContext.mockResolvedValue(null);
    render(<MonitorWindow />);

    expect(
      await screen.findByText('No se pudo iniciar el monitor de ping.'),
    ).toBeInTheDocument();
    expect(api.startPing).not.toHaveBeenCalled();
  });

  it('respeta el auto-scroll solo cuando está abajo', async () => {
    const { container } = render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');
    const log = container.querySelector('[role="log"]') as HTMLDivElement;
    Object.defineProperty(log, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(log, 'clientHeight', {
      configurable: true,
      value: 200,
    });

    log.scrollTop = 800;
    fireEvent.scroll(log);
    act(() => api.emitData('nueva línea\n'));
    await flushFrame();
    await screen.findByText('nueva línea');
    expect(log.scrollTop).toBe(1000);

    log.scrollTop = 0;
    fireEvent.scroll(log);
    act(() => api.emitData('otra línea\n'));
    await flushFrame();
    await screen.findByText('otra línea');
    expect(log.scrollTop).toBe(0);
  });

  it('aplica el tema guardado y reacciona a storage', async () => {
    localStorage.setItem('pcd-theme', 'dark');
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    expect(document.documentElement).toHaveClass('dark');

    localStorage.setItem('pcd-theme', 'light');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'pcd-theme',
        newValue: 'light',
      }),
    );

    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('marca detenido al recibir end 0', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    act(() => api.emitEnd(0));

    expect(screen.getByText('Ping detenido')).toBeInTheDocument();
    expect(screen.getByText('[proceso finalizado: 0]')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reiniciar ping' }),
    ).toBeInTheDocument();
  });

  it('marca error al recibir un end distinto de 0', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    act(() => api.emitEnd(1));

    expect(screen.getByText('Error de ping')).toBeInTheDocument();
    expect(screen.getByText('[proceso finalizado: 1]')).toBeInTheDocument();
  });

  it('no corta una línea parcial entre chunks', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    act(() => api.emitData('Respuesta desde 192.0.2.100'));
    await flushFrame();
    act(() => api.emitData(': bytes=32\n'));
    await flushFrame();

    expect(
      screen.getByText('Respuesta desde 192.0.2.100: bytes=32'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Respuesta desde 192.0.2.100'),
    ).toBeNull();
  });

  it('no revive el estado tras detener', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(screen.getByRole('button', { name: 'Detener ping' }));
    act(() => api.emitData('tarde\n'));
    await flushFrame();

    expect(screen.getByText('tarde')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reiniciar ping' }),
    ).toBeInTheDocument();
  });

  it('limpia suscripciones y detiene el ping al desmontar', async () => {
    const { unmount } = render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    unmount();

    expect(api.unsubData).toHaveBeenCalled();
    expect(api.unsubEnd).toHaveBeenCalled();
    expect(api.stopPing).toHaveBeenCalled();
  });
});
