import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePingConsole } from '../components/LivePingConsole';
import * as electronClient from '../services/electronClient';

describe('LivePingConsole Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders target IP and controls: Detener (when active), Limpiar, Copiar Último, and Copiar Logs without Iniciar button', () => {
    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    const ipLabel = screen.getByText('192.0.2.100');
    expect(ipLabel).toBeInTheDocument();
    // Se oculta la IP en anchos reducidos para evitar solapamiento con los botones de control
    expect(ipLabel).toHaveClass('hidden', 'sm:inline');
    // Redundant Iniciar button must NOT exist when idle
    expect(screen.queryByRole('button', { name: /^iniciar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar último/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar logs/i })).toBeInTheDocument();

    // When running, Detener button is present
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );
    const stopButton = screen.getByRole('button', { name: /detener/i });
    expect(stopButton).toHaveClass('bg-destructive');
    expect(stopButton).toHaveClass('text-destructive-foreground');
    expect(stopButton).not.toHaveClass('dark:bg-destructive/20');
    expect(stopButton).not.toHaveClass('dark:hover:bg-destructive/30');
  });

  it('appends multiple command executions sequentially without wiping previous history', () => {
    let capturedCallback: ((text: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      capturedCallback = onData;
      return () => {};
    });

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      capturedCallback?.('Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms');
    });

    expect(screen.getByText(/Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms/i)).toBeInTheDocument();

    // Trigger another command / ping session
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      capturedCallback?.('Respuesta continua desde 192.0.2.100: bytes=32 tiempo=5ms');
    });

    // Both previous and new command logs must be present in history!
    expect(screen.getByText(/Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Respuesta continua desde 192.0.2.100: bytes=32 tiempo=5ms/i)).toBeInTheDocument();
  });

  it('allows stopping active ping, clearing logs and copying complete logs with feedback', async () => {
    const onTogglePing = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    let dataHandler: ((t: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={onTogglePing}
      />
    );

    // Simulate arriving logs
    act(() => {
      dataHandler?.('Respuesta 1: bytes=32 tiempo=2ms');
      dataHandler?.('Respuesta 2: bytes=32 tiempo=3ms');
    });

    // Click Stop button
    const stopBtn = screen.getByRole('button', { name: /detener/i });
    fireEvent.click(stopBtn);
    expect(onTogglePing).toHaveBeenCalledTimes(1);

    // Click Copy Logs button
    const copyBtn = screen.getByRole('button', { name: /copiar logs de ping/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
    expect(screen.getByText(/^logs copiados$/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /logs copiados al portapapeles/i,
    );

    // Click Clear button
    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect(screen.queryByText(/Respuesta 1/i)).not.toBeInTheDocument();
  });

  it('copies only the last command output block when clicking "Copiar Último"', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    let dataHandler: ((t: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    // Command 1 output
    act(() => {
      dataHandler?.('Respuesta comando 1: bytes=32');
    });

    // End command 1, start command 2
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    // Command 2 output
    act(() => {
      dataHandler?.('Respuesta comando 2: bytes=32 tiempo=10ms');
    });

    const copyLastBtn = screen.getByRole('button', { name: /copiar último bloque/i });
    fireEvent.click(copyLastBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    const lastCopiedText = writeTextMock.mock.calls[0][0];
    expect(lastCopiedText).toContain('Respuesta comando 2');
    expect(lastCopiedText).not.toContain('Respuesta comando 1');
    expect(screen.getByText(/^bloque copiado$/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /bloque copiado al portapapeles/i,
    );
  });

  it('auto-scrolls strictly inside the terminal element when new lines arrive', () => {
    let dataHandler: ((t: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    const { container } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    const scrollBox = container.querySelector('[data-testid="terminal-scroll-container"]') as HTMLDivElement;
    expect(scrollBox).not.toBeNull();

    // Mock scrollHeight
    Object.defineProperty(scrollBox, 'scrollHeight', {
      value: 1200,
      configurable: true,
      writable: true,
    });

    act(() => {
      dataHandler?.('Línea 1 en ejecución...');
    });

    // Internal scrollTop must equal scrollHeight
    expect(scrollBox.scrollTop).toBe(1200);
  });

  it('calls onPingComplete when the ping process finishes (onDone callback)', () => {
    const onPingComplete = vi.fn();
    let doneHandler: ((code: number) => void) | null = null;

    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, _onData, onDone) => {
      doneHandler = onDone || null;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
        onPingComplete={onPingComplete}
      />
    );

    act(() => {
      doneHandler?.(0);
    });

    expect(onPingComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Proceso ping finalizado/i)).toBeInTheDocument();
  });

  it('renders windows console aesthetic with bg-console-bg, whitespace-pre, horizontal overflow and sanitizes corrupt ping accents', () => {
    let capturedCallback: ((text: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      capturedCallback = onData;
      return () => {};
    });

    const { container } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    // Feed raw Windows ping text with CP850/CP1252 corrupted characters
    act(() => {
      capturedCallback?.('Estadsticas de ping para 192.0.2.100:\r\n    Paquetes: enviados = 4, recibidos = 4, perdidos = 0\r\n    (0% perdidos),\r\nTiempos aproximados de ida y vuelta en milisegundos:\r\n    Mnimo = 14ms, Mximo = 14ms, Media = 14ms');
    });

    // Sanitized output check
    expect(screen.getByText(/Estadísticas de ping/i)).toBeInTheDocument();
    expect(screen.getByText(/Mínimo = 14ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Máximo = 14ms/i)).toBeInTheDocument();

    // Check terminal styling
    const terminalBox = container.querySelector('[data-testid="terminal-scroll-container"]');
    expect(terminalBox?.className).toContain("bg-console-bg");
    expect(terminalBox).not.toBeNull();
    expect(terminalBox?.className).toContain('overflow-x-auto');
  });

  it('renders contiguous console without section title and with adaptive height', () => {
    const { container } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    // Section title is omitted (no "Consola de Ping en Vivo:")
    expect(screen.queryByText(/Consola de Ping en Vivo:/i)).toBeNull();

    // Redundant Iniciar is removed; Limpiar and Copiar Logs remain
    expect(screen.queryByRole('button', { name: /^iniciar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar logs/i })).toBeInTheDocument();

    // La consola ocupa siempre la mitad del alto de la ventana
    const terminalBox = container.querySelector('[data-testid="terminal-scroll-container"]');
    expect(terminalBox?.className).toContain('h-[50vh]');
    expect(terminalBox?.className).not.toContain('min-h-[24rem]');
  });

  it('never calls scrollIntoView when ping data arrives, ping finishes, or logs are cleared', () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    let dataCallback: ((text: string) => void) | null = null;
    let doneCallback: ((code: number) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData, onDone) => {
      dataCallback = onData;
      doneCallback = onDone || null;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    // Initial mount and log replacement
    scrollMock.mockClear();

    // Data arrives
    act(() => {
      dataCallback?.('Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms');
    });

    expect(scrollMock).not.toHaveBeenCalled();

    // Ping finishes
    act(() => {
      doneCallback?.(0);
    });

    expect(scrollMock).not.toHaveBeenCalled();

    // Logs cleared
    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect(scrollMock).not.toHaveBeenCalled();
  });

  it('renders account mode header and highlights global groups', () => {
    let push: ((text: string) => void) | null = null;
    let finish: ((code: number) => void) | null = null;
    const onDiagnosticComplete = vi.fn();

    vi.spyOn(electronClient, 'subscribeToDiagnosticCommand').mockImplementation(
      (_command, _target, onData, onEnd) => {
        push = onData;
        finish = onEnd;
        return () => {};
      },
    );

    render(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={{
          id: 'diag-1',
          command: 'netuser',
          target: 'jperez',
          argsText: 'net user jperez /domain',
          timestamp: '10:00:00',
        }}
        onTogglePing={vi.fn()}
        onDiagnosticComplete={onDiagnosticComplete}
      />,
    );

    expect(screen.getByText(/Cuenta AD · jperez/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /consola de cuenta ad · jperez/i }),
    ).toBeInTheDocument();

    act(() => {
      push?.('Miembro de grupos globales  *GRUPO-SOPORTE  *GRUPO-OPERADORES\n');
    });

    expect(
      screen.getByText(/Miembro de grupos globales/),
    ).toHaveClass('text-console-info');

    act(() => {
      finish?.(0);
    });

    expect(onDiagnosticComplete).toHaveBeenCalledTimes(1);
  });

  it('fills the height and exposes the rerun action in account mode', () => {
    const onRerun = vi.fn();

    const { container } = render(
      <LivePingConsole
        mode="account"
        fill
        targetLabel="jperez"
        ip=""
        isPinging={false}
        onTogglePing={vi.fn()}
        onRerun={onRerun}
      />,
    );

    // Abierta reclama altura; al colapsar la libera y al reabrir la recupera
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-full');

    const trigger = screen.getByRole('button', { name: /consola/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(root.className).not.toContain('h-full');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root.className).toContain('h-full');

    fireEvent.click(
      screen.getByRole('button', { name: 'Re-ejecutar consulta' }),
    );
    expect(onRerun).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: /cerrar consulta/i }),
    ).not.toBeInTheDocument();
  });

  it("arranca abierta y se puede colapsar", () => {
    render(
      <LivePingConsole ip="10.0.0.5" isPinging={false} onTogglePing={vi.fn()} />,
    );
    const trigger = screen.getByRole("button", { name: /consola/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("terminal-scroll-container")).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("terminal-scroll-container")).toBeNull();
  });

  it("mantiene el colapso ante una señal ya procesada y reabre con un incremento", () => {
    const { rerender } = render(
      <LivePingConsole
        ip="10.0.0.5"
        isPinging={false}
        openSignal={2}
        onTogglePing={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /consola/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // El operador la colapsa: una señal que ya fue procesada no la reabre.
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(
      <LivePingConsole
        ip="10.0.0.5"
        isPinging={false}
        openSignal={2}
        onTogglePing={vi.fn()}
      />,
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(
      <LivePingConsole
        ip="10.0.0.5"
        isPinging={false}
        openSignal={3}
        onTogglePing={vi.fn()}
      />,
    );

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("se colapsa y se vuelve a expandir con el encabezado", () => {
    render(
      <LivePingConsole ip="10.0.0.5" isPinging={false} onTogglePing={vi.fn()} />,
    );
    const trigger = screen.getByRole("button", { name: /consola/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      document.querySelector('[data-slot="collapsible-content"]'),
    ).toHaveAttribute("data-state", "closed");
    expect(screen.queryByTestId("terminal-scroll-container")).toBeNull();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      document.querySelector('[data-slot="collapsible-content"]'),
    ).toHaveAttribute("data-state", "open");
    expect(screen.getByTestId("terminal-scroll-container")).toBeInTheDocument();
  });

  it("mantiene el colapso manual al re-renderizar con el mismo comando", () => {
    vi.spyOn(electronClient, 'subscribeToDiagnosticCommand').mockImplementation(
      () => () => {},
    );
    const command = {
      id: "diag-1",
      command: "netuser" as const,
      target: "jperez",
      argsText: "net user jperez /domain",
      timestamp: "10:00:00",
    };

    const { rerender } = render(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={command}
        onTogglePing={vi.fn()}
      />,
    );

    // La ejecución la abrió; el operador la cierra
    fireEvent.click(screen.getByRole("button", { name: /consola/i }));

    rerender(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={{ ...command, timestamp: "11:00:00" }}
        onTogglePing={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /consola/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByTestId("terminal-scroll-container")).toBeNull();
  });

  it("permanece colapsada al re-renderizar sin ejecución activa", () => {
    vi.spyOn(electronClient, 'subscribeToDiagnosticCommand').mockImplementation(
      () => () => {},
    );
    const command = {
      id: "diag-1",
      command: "netuser" as const,
      target: "jperez",
      argsText: "net user jperez /domain",
      timestamp: "10:00:00",
    };

    const { rerender } = render(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={command}
        onTogglePing={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /consola/i }));

    rerender(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={null}
        onTogglePing={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /consola/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByTestId("terminal-scroll-container")).toBeNull();
  });

  it("compacta la cabecera de la consola: acciones sólo con icono bajo 640 px", () => {
    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onRerun={vi.fn()}
        onTogglePing={vi.fn()}
      />,
    );

    const headerTrigger = screen.getByRole("button", {
      name: /consola de 192\.0\.2\.100/i,
    });
    expect(headerTrigger.querySelector("span")?.className).toContain("truncate");

    const actionLabels = [
      /detener ping en vivo/i,
      /re-ejecutar consulta/i,
      /limpiar logs de ping/i,
      /copiar último bloque de logs/i,
      /copiar logs de ping/i,
    ];

    for (const name of actionLabels) {
      const button = screen.getByRole("button", { name });
      expect(button.querySelector("span")?.className).toContain("max-sm:hidden");
    }

    const actions = screen.getByTestId("console-header")
      .lastElementChild as HTMLElement;
    expect(actions.className).toContain("shrink-0");
  });

  it("distingue copiar último bloque de copiar todos por icono", () => {
    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />,
    );

    const copyLastIcon = screen
      .getByRole("button", { name: /copiar último bloque de logs/i })
      .querySelector("svg");
    expect(copyLastIcon?.classList.contains("lucide-copy")).toBe(true);

    const copyAllIcon = screen
      .getByRole("button", { name: /copiar logs de ping/i })
      .querySelector("svg");
    expect(copyAllIcon?.classList.contains("lucide-clipboard-list")).toBe(true);
  });

  it("muestra estadísticas al detener un ping continuo", () => {
    let dataHandler: ((text: string) => void) | null = null;
    let doneHandler: ((code: number | null) => void) | null = null;

    vi.spyOn(electronClient, "subscribeToPing").mockImplementation(
      (_target, onData, onDone) => {
        dataHandler = onData;
        doneHandler = onDone as typeof doneHandler;
        return () => {};
      },
    );

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.103"
        isPinging={true}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />,
    );

    act(() => {
      dataHandler?.("Respuesta desde 192.0.2.103: bytes=32 tiempo=13ms TTL=64");
      dataHandler?.("Respuesta desde 192.0.2.103: bytes=32 tiempo=14ms TTL=64");
      dataHandler?.("Respuesta desde 192.0.2.103: bytes=32 tiempo=13ms TTL=64");
    });

    act(() => {
      doneHandler?.(null);
    });

    expect(
      screen.getByText(/Estadísticas de ping para 192\.0\.2\.103:/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Paquetes: enviados = 3, recibidos = 3, perdidos = 0/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Mínimo = 13ms, Máximo = 14ms, Media = 13ms/),
    ).toBeInTheDocument();

    // El ping-end ya cerró la sesión: la transición a detenido no duplica nada.
    rerender(
      <LivePingConsole
        ip="192.0.2.103"
        isPinging={false}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />,
    );
    expect(
      screen.getAllByText(/Estadísticas de ping para 192\.0\.2\.103:/),
    ).toHaveLength(1);
    expect(screen.getAllByText(/Proceso ping detenido/)).toHaveLength(1);
  });

  it("resume sólo la sesión continua actual cuando la cabecera tiene prefijo", () => {
    let dataHandler: ((text: string) => void) | null = null;
    let doneHandler: ((code: number | null) => void) | null = null;

    vi.spyOn(electronClient, "subscribeToPing").mockImplementation(
      (_target, onData, onDone) => {
        dataHandler = onData;
        doneHandler = onDone as typeof doneHandler;
        return () => {};
      },
    );

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.10"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />,
    );

    act(() => {
      dataHandler?.("Respuesta desde 192.0.2.10: bytes=32 tiempo=99ms TTL=64");
    });

    rerender(
      <LivePingConsole
        ip="192.0.2.10"
        isPinging={false}
        onTogglePing={vi.fn()}
      />,
    );

    rerender(
      <LivePingConsole
        ip="192.0.2.250"
        isPinging={true}
        pingMode="infinite"
        linePrefix="[ROUTER .250]"
        onTogglePing={vi.fn()}
      />,
    );

    act(() => {
      dataHandler?.(
        "Respuesta desde 192.0.2.250: bytes=32 tiempo=13ms TTL=64",
      );
    });

    act(() => {
      doneHandler?.(null);
    });

    expect(
      screen.getByText(/Estadísticas de ping para 192\.0\.2\.250:/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Paquetes: enviados = 1, recibidos = 1, perdidos = 0/,
      ),
    ).toBeInTheDocument();
  });

  it("muestra el resumen al detener el ping continuo desde la UI", () => {
    let dataHandler: ((text: string) => void) | null = null;

    vi.spyOn(electronClient, "subscribeToPing").mockImplementation(
      (_target, onData) => {
        dataHandler = onData;
        return () => {};
      },
    );

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.103"
        isPinging={true}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />,
    );

    act(() => {
      dataHandler?.("Respuesta desde 192.0.2.103: bytes=32 tiempo=13ms TTL=124");
      dataHandler?.("Respuesta desde 192.0.2.103: bytes=32 tiempo=13ms TTL=124");
    });

    rerender(
      <LivePingConsole
        ip="192.0.2.103"
        isPinging={false}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Estadísticas de ping para 192\.0\.2\.103:/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Paquetes: enviados = 2, recibidos = 2, perdidos = 0/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Proceso ping detenido/)).toBeInTheDocument();
  });

  it('aplica whitespace-pre y overflow-x-auto cuando consoleWrap es false por defecto', () => {
    let dataHandler: any;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.200"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      dataHandler?.("Linea muy larga de diagnóstico sin saltos de linea");
    });

    const scrollContainer = screen.getByTestId('terminal-scroll-container');
    expect(scrollContainer.className).toContain('overflow-x-auto');
    expect(scrollContainer.className).not.toContain('overflow-x-hidden');

    const lineEl = screen.getByText("Linea muy larga de diagnóstico sin saltos de linea");
    expect(lineEl.className).toContain('whitespace-pre');
    expect(lineEl.className).not.toContain('whitespace-pre-wrap');
    expect(lineEl.className).not.toContain('break-words');
  });

  it('aplica whitespace-pre-wrap, break-words y overflow-x-hidden cuando consoleWrap es true', () => {
    let dataHandler: any;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.201"
        isPinging={true}
        wrap={true}
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      dataHandler?.("Linea muy larga que debe ajustarse automáticamente con saltos suaves");
    });

    const scrollContainer = screen.getByTestId('terminal-scroll-container');
    expect(scrollContainer.className).toContain('overflow-x-hidden');
    expect(scrollContainer.className).not.toContain('overflow-x-auto');

    const lineEl = screen.getByText("Linea muy larga que debe ajustarse automáticamente con saltos suaves");
    expect(lineEl.className).toContain('whitespace-pre-wrap');
    expect(lineEl.className).toContain('break-words');
    expect(lineEl.className).not.toContain('whitespace-pre ');
  });

  it('reacciona dinámicamente al evento pcd:console-wrap-changed si no se pasa prop explícita', () => {
    let dataHandler: any;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.202"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      dataHandler?.("Linea reactiva al evento global de wrap");
    });

    const scrollContainer = screen.getByTestId('terminal-scroll-container');
    expect(scrollContainer.className).toContain('overflow-x-auto');

    act(() => {
      window.dispatchEvent(
        new CustomEvent('pcd:console-wrap-changed', {
          detail: { consoleWrap: true },
        })
      );
    });

    expect(scrollContainer.className).toContain('overflow-x-hidden');
    const lineEl = screen.getByText("Linea reactiva al evento global de wrap");
    expect(lineEl.className).toContain('whitespace-pre-wrap');
    expect(lineEl.className).toContain('break-words');
  });

  describe('Console Block Hover and Copy Interaction', () => {
    it('renders output lines segmented into hoverable blocks with data-testid="console-block" and selection disabled', () => {
      let dataHandler: any;
      vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
        dataHandler = onData;
        return () => {};
      });

      render(
        <LivePingConsole
          ip="192.0.2.55"
          isPinging={true}
          pingMode="standard"
          onTogglePing={vi.fn()}
        />
      );

      act(() => {
        dataHandler?.("Respuesta desde 192.0.2.55: bytes=32 tiempo=1ms");
      });

      // Selección de texto desactivada en el contenedor de la consola
      const scrollContainer = screen.getByTestId('terminal-scroll-container');
      expect(scrollContainer.className).toContain('select-none');

      const blocks = screen.getAllByTestId('console-block');
      expect(blocks.length).toBeGreaterThanOrEqual(1);

      const firstBlock = blocks[0];
      expect(firstBlock).toHaveAttribute('data-block-id');
      expect(firstBlock).toHaveAttribute('role', 'button');
      expect(firstBlock).toHaveAttribute('tabindex', '0');
      expect(firstBlock.className).toContain('cursor-pointer');
      expect(firstBlock.className).toContain('select-none');
      expect(firstBlock.className).toContain('hover:bg-black/60');
      // Sin bordes decorativos en hover
      expect(firstBlock.className).not.toContain('border-border');
    });

    it('copies only the specific block content to clipboard when clicking anywhere on that block', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      let dataHandler: any;
      let pingCompleteHandler: any;
      vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData, onEnd) => {
        dataHandler = onData;
        pingCompleteHandler = onEnd;
        return () => {};
      });

      let diagHandler: any;
      let diagCompleteHandler: any;
      vi.spyOn(electronClient, 'subscribeToDiagnosticCommand').mockImplementation((_cmd, _target, onData, onEnd) => {
        diagHandler = onData;
        diagCompleteHandler = onEnd;
        return () => {};
      });

      const { rerender } = render(
        <LivePingConsole
          ip="192.0.2.55"
          isPinging={true}
          pingMode="standard"
          onTogglePing={vi.fn()}
        />
      );

      // Salida bloque 1: Ping
      act(() => {
        dataHandler?.("Respuesta desde 192.0.2.55: bytes=32 tiempo=1ms");
        pingCompleteHandler?.(0);
      });

      // Ejecutar segundo comando (Tracert)
      rerender(
        <LivePingConsole
          ip="192.0.2.55"
          isPinging={false}
          activeCommand={{
            id: 'cmd-tracert-1',
            command: 'tracert',
            target: '192.0.2.55',
            argsText: 'tracert -d 192.0.2.55',
            timestamp: '12:00:10',
          }}
          onTogglePing={vi.fn()}
        />
      );

      act(() => {
        diagHandler?.("  1    <1 ms    <1 ms  192.0.2.55");
        diagCompleteHandler?.(0);
      });

      const blocks = screen.getAllByTestId('console-block');
      expect(blocks).toHaveLength(2);

      // Clic directo en cualquier parte del segundo bloque (Tracert)
      await act(async () => {
        fireEvent.click(blocks[1]);
      });

      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedText = writeTextMock.mock.calls[0][0];
      expect(copiedText).toContain("tracert -d 192.0.2.55");
      expect(copiedText).toContain("192.0.2.55");
      // NO debe incluir la cabecera del ping del primer bloque
      expect(copiedText).not.toContain("ping -n 4 192.0.2.55");

      // Anuncio accesible en el DOM
      expect(screen.getByRole('status')).toHaveTextContent(/bloque copiado al portapapeles/i);
    });
  });

});
