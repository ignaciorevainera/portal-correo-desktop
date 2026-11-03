import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';
import { RemoteProbeResult } from '../services/electronClient';

describe('QuickActionsBar Inline Feedback & Shortcut Keys', () => {
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

  it('muestra las dos acciones primarias y oculta los comandos secundarios', () => {
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

    // Ningún comando movido al menú debe quedar visible en la barra
    expect(screen.queryByRole('button', { name: /escanear subred/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /menú de diagnóstico de red/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /hacer ping al router \.250/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /hacer ping al servidor \.231/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ejecutar nbtstat/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /refrescar uptime/i })).toBeNull();
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
      'Hacer ping al router .250',
      'Ping continuo -t router .250',
      'Hacer ping al servidor .231',
      'Ping continuo -t servidor .231',
      'Escanear Subred',
      'Refrescar Uptime',
    ]);

    fireEvent.click(within(dialog).getByRole('button', { name: /escanear subred/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /más acciones/i })).toHaveFocus();
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
});
