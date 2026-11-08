import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';
import { RemoteProbeResult } from '../services/electronClient';
import { TerminalData } from '../types/terminal';

describe('QuickActionsBar & Shortcut Keys', () => {
  const terminal = getAllTerminals()[0];

  it('renders default quick actions and Uptime metric including Ping and secondary Ping -t', () => {
    const onTogglePing = vi.fn();
    const onLaunchPingInfinite = vi.fn();

    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={onTogglePing}
        onLaunchPingInfinite={onLaunchPingInfinite}
      />
    );

    // Primary CTA and Dropdown trigger
    expect(screen.getByRole('button', { name: /conexión remota inteligente/i })).toBeInTheDocument();
    const dropdownTrigger = screen.getByRole('button', { name: /opciones de conexión remota/i });
    expect(dropdownTrigger).toBeInTheDocument();

    // Opening dropdown reveals manual override buttons
    fireEvent.click(dropdownTrigger);
    expect(screen.getByRole('button', { name: /conectar por vnc viewer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar asistencia msra/i })).toBeInTheDocument();
    
    const pingBtn = screen.getByRole('button', { name: /^iniciar ping$/i });
    const pingInfiniteBtn = screen.getByRole('button', { name: /iniciar ping continuo -t/i });

    expect(pingBtn).toBeInTheDocument();
    expect(pingInfiniteBtn).toBeInTheDocument();
    expect(screen.getByText(terminal.uptimeText)).toBeInTheDocument();
    expect(screen.getByTitle(/uptime:/i)).toBeInTheDocument();

    // Width footprint check: Remote connection has expanded room, Ping button is unified in split button
    expect(pingBtn.className).toContain('rounded-r-none');
    expect(pingInfiniteBtn.className).toContain('rounded-l-none');

    fireEvent.click(pingBtn);
    expect(onTogglePing).toHaveBeenCalledTimes(1);

    fireEvent.click(pingInfiniteBtn);
    expect(onLaunchPingInfinite).toHaveBeenCalledTimes(1);
  });

  it('dispatches the action callback when clicking action buttons', () => {
    const onLaunchVnc = vi.fn();
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={onLaunchVnc}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    const dropdownTrigger = screen.getByRole('button', { name: /opciones de conexión remota/i });
    fireEvent.click(dropdownTrigger);

    const vncBtn = screen.getByRole('button', { name: /conectar por vnc viewer/i });
    fireEvent.click(vncBtn);
    expect(onLaunchVnc).toHaveBeenCalledTimes(1);
  });

  it('usa destructive sólido en el control de detener sin tintes de hover', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={true}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    const stopPingBtn = screen.getByRole('button', { name: /detener ping en vivo/i });
    expect(stopPingBtn).toHaveClass('bg-destructive');
    expect(stopPingBtn).toHaveClass('text-destructive-foreground');
    expect(stopPingBtn).toHaveClass('hover:bg-destructive/90');
    expect(stopPingBtn).not.toHaveClass('dark:bg-destructive/20');
    expect(stopPingBtn).not.toHaveClass('dark:hover:bg-destructive/30');
  });

  it('uses pulse animation (animate-pulse) instead of spin (animate-spin) while pinging', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={true}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    const stopPingBtn = screen.getByRole('button', { name: /detener ping en vivo/i });
    const icon = stopPingBtn.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('class')).toContain('animate-pulse');
    expect(icon?.getAttribute('class')).not.toContain('animate-spin');
  });

  it('renders directly inside the container without Card wrapper or extra CardTitle', () => {
    const { container } = render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    expect(container.querySelector('[data-slot="card"]')).toBeNull();
    expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
    expect(container.querySelector('[data-slot="card-title"]')).toBeNull();
  });

  describe('Unified Smart Remote Split Button', () => {
    it('adapts primary CTA dynamically based on remoteProbe recommendations', () => {
      // 1. Probing state
      const { rerender } = render(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          isProbingRemote={true}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );
      expect(screen.getByText(/detectando acceso/i)).toBeInTheDocument();

      // 2. VNC recommended (:5901)
      const vncProbe: RemoteProbeResult = {
        host: '192.0.2.10',
        vncPort: 5901,
        port5901Open: true,
        port5900Open: false,
        msraAvailable: true,
        recommendedMethod: 'vnc',
      };
      rerender(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          remoteProbe={vncProbe}
          isProbingRemote={false}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );
      const ctaVnc = screen.getByRole('button', { name: /conexión remota inteligente/i });
      expect(ctaVnc.textContent).toMatch(/vnc/i);
      expect(ctaVnc.textContent).toMatch(/:5901/);

      // 3. MSRA recommended (VNC closed)
      const msraProbe: RemoteProbeResult = {
        host: '192.0.2.10',
        vncPort: null,
        port5901Open: false,
        port5900Open: false,
        msraAvailable: true,
        recommendedMethod: 'msra',
      };
      rerender(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          remoteProbe={msraProbe}
          isProbingRemote={false}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );
      const ctaMsra = screen.getByRole('button', { name: /conexión remota inteligente/i });
      expect(ctaMsra.textContent).toMatch(/msra/i);

      // 4. None recommended (both closed)
      const noneProbe: RemoteProbeResult = {
        host: '192.0.2.10',
        vncPort: null,
        port5901Open: false,
        port5900Open: false,
        msraAvailable: false,
        recommendedMethod: 'none',
      };
      rerender(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          remoteProbe={noneProbe}
          isProbingRemote={false}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );
      const ctaNone = screen.getByRole('button', { name: /conexión remota inteligente/i });
      expect(ctaNone.textContent).toMatch(/sin acceso|reintentar/i);
    });

    it('triggers onLaunchSmartRemote when clicking primary CTA (or falls back to onLaunchVnc)', () => {
      const onLaunchSmartRemote = vi.fn();
      const onLaunchVnc = vi.fn();

      const { rerender } = render(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          onLaunchSmartRemote={onLaunchSmartRemote}
          onLaunchVnc={onLaunchVnc}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );

      const cta = screen.getByRole('button', { name: /conexión remota inteligente/i });
      fireEvent.click(cta);
      expect(onLaunchSmartRemote).toHaveBeenCalledTimes(1);
      expect(onLaunchVnc).not.toHaveBeenCalled();

      // Fallback when onLaunchSmartRemote is not provided
      rerender(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={onLaunchVnc}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );
      const ctaFallback = screen.getByRole('button', { name: /conexión remota inteligente/i });
      fireEvent.click(ctaFallback);
      expect(onLaunchVnc).toHaveBeenCalledTimes(1);
    });

    it('opens dropdown menu with live port status and allows manual trigger or re-probe', () => {
      const onReProbe = vi.fn();
      const probe: RemoteProbeResult = {
        host: '192.0.2.10',
        vncPort: 5901,
        port5901Open: true,
        port5900Open: false,
        msraAvailable: true,
        recommendedMethod: 'vnc',
      };

      render(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          remoteProbe={probe}
          onReProbeRemote={onReProbe}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      );

      // Open dropdown
      const dropdownTrigger = screen.getByRole('button', { name: /opciones de conexión remota/i });
      fireEvent.click(dropdownTrigger);

      // Status badges visible
      expect(screen.getByText(/5901\/5900:/i)).toBeInTheDocument();
      expect(screen.getByText(/3389\/135:/i)).toBeInTheDocument();

      // Re-verificar puertos button
      const reprobeBtn = screen.getByRole('button', { name: /re-verificar puertos/i });
      fireEvent.click(reprobeBtn);
      expect(onReProbe).toHaveBeenCalledTimes(1);
    });
  });

  it('muestra las acciones primarias y los pings del sitio, y deja los secundarios en Más', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onOpenSubnetScanner={vi.fn()}
        onRefreshUptime={vi.fn()}
        onLaunchSitePing={vi.fn()}
        onRunDiagnostic={vi.fn()}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /conexión remota inteligente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^iniciar ping$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /más acciones/i })).toBeInTheDocument();

    // Los pings de los enlaces del sitio están siempre visibles, sin abrir el menú.
    expect(screen.queryByRole('dialog')).toBeNull();
    const sitePings = [
      'Hacer ping al router .250',
      'Ping continuo -t router .250',
      'Hacer ping al servidor .231',
      'Ping continuo -t servidor .231',
    ];
    for (const name of sitePings) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Hacer ping al router .250' }).className).toContain('rounded-r-none');
    expect(screen.getByRole('button', { name: 'Ping continuo -t router .250' }).className).toContain('rounded-l-none');

    // Ningún comando secundario queda visible en la barra.
    expect(screen.queryByRole('button', { name: /escanear subred/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ejecutar nbtstat/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /refrescar uptime/i })).toBeNull();
  });

  it('dispara los pings de los enlaces del sitio desde la barra visible', () => {
    const onLaunchSitePing = vi.fn();
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchSitePing={onLaunchSitePing}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hacer ping al router .250' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ping continuo -t router .250' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hacer ping al servidor .231' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ping continuo -t servidor .231' }));

    expect(onLaunchSitePing.mock.calls).toEqual([
      ['router', 'standard'],
      ['router', 'infinite'],
      ['server', 'standard'],
      ['server', 'infinite'],
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('no muestra los pings del sitio si no se pueden derivar los enlaces', () => {
    render(
      <QuickActionsBar
        terminal={{ ...terminal, ip: 'sin-ip' }}
        isPinging={false}
        onLaunchSitePing={vi.fn()}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /hacer ping al router/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ping continuo -t router/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /hacer ping al servidor/i })).toBeNull();
  });

  it('el menú Más contiene las acciones secundarias en orden', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onOpenSubnetScanner={vi.fn()}
        onRefreshUptime={vi.fn()}
        onLaunchSitePing={vi.fn()}
        onRunDiagnostic={vi.fn()}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /más acciones/i }));

    const dialog = screen.getByRole('dialog', { name: /más acciones/i });
    const items = within(dialog).getAllByRole('button');
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual([
      'Ejecutar Nbtstat',
      'Ejecutar Tracert',
      'Ejecutar ARP',
      'Escanear Subred',
      'Refrescar Uptime',
    ]);

    fireEvent.click(within(dialog).getByRole('button', { name: /escanear subred/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /más acciones/i })).toHaveFocus();
  });

  it('dispara onRefreshUptime desde el menú Más', () => {
    const onRefreshUptime = vi.fn();
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onRefreshUptime={onRefreshUptime}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /más acciones/i }));
    fireEvent.click(screen.getByRole('button', { name: /refrescar uptime/i }));

    expect(onRefreshUptime).toHaveBeenCalledTimes(1);
  });

  describe('Diagnostic Tools inside the Más menu (Nbtstat, Tracert, ARP)', () => {
    it('opens the Más menu and triggers onRunDiagnostic with chosen command', () => {
      const onRunDiagnostic = vi.fn();

      render(
        <QuickActionsBar
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
          onRunDiagnostic={onRunDiagnostic}
        />
      );

      // Open the Más menu
      fireEvent.click(screen.getByRole('button', { name: /más/i }));

      expect(screen.getByRole('button', { name: /ejecutar nbtstat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ejecutar tracert/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ejecutar arp/i })).toBeInTheDocument();

      // Click Tracert
      fireEvent.click(screen.getByRole('button', { name: /ejecutar tracert/i }));
      expect(onRunDiagnostic).toHaveBeenCalledWith('tracert');
    });
  });

  it("agrupa y llena las filas de acciones ocupando todo el ancho disponible sin huecos", () => {
    const { container } = render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchPingInfinite={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    const remote = screen.getByRole("button", {
      name: /conexión remota inteligente/i,
    });
    const remoteContainer = remote.closest("div.relative");
    expect(remoteContainer?.className).toContain("grow");
    expect(remoteContainer?.className).toContain("flex-[2]");

    const ping = screen.getByRole("button", { name: /^iniciar ping$/i });
    expect(ping.parentElement?.className).toContain("grow");
    expect(ping.parentElement?.className).toContain("flex-[1.5]");

    const more = screen.getByRole("button", { name: /más acciones/i });
    expect(more.className).toContain("grow");
    expect(more.className).toContain("flex-1");

    const secondary = screen.getByTestId("secondary-actions");
    expect(secondary.className).toContain("contents");

    const router = screen.getByRole("button", {
      name: /hacer ping al router \.250/i,
    });
    const server = screen.getByRole("button", {
      name: /hacer ping al servidor \.231/i,
    });
    const uptime = container.querySelector('[title^="Uptime:"]');
    expect(uptime).not.toBeNull();
    expect(secondary.contains(uptime!)).toBe(true);

    for (const group of [router.parentElement, server.parentElement, uptime]) {
      expect(group?.className).toContain("grow");
      expect(group?.className).toContain("flex-1");
    }
    expect(router.className).toContain("flex-1");
    expect(server.className).toContain("flex-1");

    expect(container.querySelector('[class*="flex-wrap"]')).not.toBeNull();
  });

  it("llena el espacio con el chip de uptime cuando no hay enlaces del sitio", () => {
    const { container } = render(
      <QuickActionsBar
        terminal={{ ...terminal, ip: "hostname-solo" }}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    expect(
      screen.queryByRole("button", { name: /hacer ping al router/i }),
    ).toBeNull();

    const uptime = container.querySelector('[title^="Uptime:"]');
    expect(uptime?.className).toContain("flex-1");
    expect(uptime?.className).toContain("grow");
  });
});

describe('QuickActionsBar Polish: Subnet Scanner & Uptime Refresh', () => {
  const polishTerminal: TerminalData = {
    pc: 'PC-TEST-001',
    ip: '192.0.2.100',
    mac: '00:11:22:33:44:55',
    os: 'Windows 10',
    servicePack: '21H2',
    architecture: 'x64',
    surveyDate: '2026-10-26',
    cpuModel: 'Intel Core i5',
    ram: '8 GB',
    userNt: 'testuser',
    location: 'Buenos Aires',
    antivirusVersion: 'Defender 1.0',
    ieVersion: '11.0',
    uptimeText: '4 días, 6 horas',
    alerts: [],
    resetHistory: [],
  };

  it('renders "Escanear Subred" button and triggers callback on click', () => {
    const onOpenSubnet = vi.fn();
    render(
      <QuickActionsBar
        terminal={polishTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onOpenSubnetScanner={onOpenSubnet}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    const scanBtn = screen.getByRole('button', { name: /escanear subred/i });
    expect(scanBtn).toBeInTheDocument();
    fireEvent.click(scanBtn);
    expect(onOpenSubnet).toHaveBeenCalledTimes(1);
  });

  it('renders display-only Uptime chip and refreshes from the Más menu', () => {
    const onRefreshUptime = vi.fn();
    render(
      <QuickActionsBar
        terminal={polishTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onRefreshUptime={onRefreshUptime}
        isRefreshingUptime={false}
      />,
    );

    expect(screen.getByText(polishTerminal.uptimeText)).toBeInTheDocument();
    expect(screen.getByTitle(/uptime:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    const refreshBtn = screen.getByRole('button', { name: /refrescar uptime/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    expect(onRefreshUptime).toHaveBeenCalledTimes(1);
  });

  it('dispara la asistencia MSRA desde el desplegable de conexión remota', () => {
    const onLaunchMsra = vi.fn();
    render(
      <QuickActionsBar
        terminal={polishTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={onLaunchMsra}
        onTogglePing={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /opciones de conexión remota/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /iniciar asistencia msra/i }),
    );

    expect(onLaunchMsra).toHaveBeenCalledTimes(1);
  });
});
