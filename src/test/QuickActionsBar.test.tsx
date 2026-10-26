import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';
import { toast } from 'sonner';
import { RemoteProbeResult } from '../services/electronClient';

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

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
    expect(screen.getByText(/uptime/i)).toBeInTheDocument();

    // Ratio 2:1 check
    expect(pingBtn.className).toContain('flex-[2]');
    expect(pingInfiniteBtn.className).toContain('flex-1');

    fireEvent.click(pingBtn);
    expect(onTogglePing).toHaveBeenCalledTimes(1);

    fireEvent.click(pingInfiniteBtn);
    expect(onLaunchPingInfinite).toHaveBeenCalledTimes(1);
  });

  it('triggers sonner toast notification when clicking action buttons', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    const dropdownTrigger = screen.getByRole('button', { name: /opciones de conexión remota/i });
    fireEvent.click(dropdownTrigger);

    const vncBtn = screen.getByRole('button', { name: /conectar por vnc viewer/i });
    fireEvent.click(vncBtn);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('VNC Viewer'));
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

  describe('Diagnostic Tools Dropdown (Nbtstat, Tracert, ARP)', () => {
    it('renders Diagnóstico dropdown button and triggers onRunDiagnostic with chosen command', () => {
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

      const diagTrigger = screen.getByRole('button', { name: /menú de diagnóstico de red/i });
      expect(diagTrigger).toBeInTheDocument();

      // Open diagnostic menu
      fireEvent.click(diagTrigger);

      expect(screen.getByRole('button', { name: /ejecutar nbtstat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ejecutar tracert/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ejecutar arp/i })).toBeInTheDocument();

      // Click Tracert
      fireEvent.click(screen.getByRole('button', { name: /ejecutar tracert/i }));
      expect(onRunDiagnostic).toHaveBeenCalledWith('tracert');
    });
  });
});
