import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar } from '../components/QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';
import { toast } from 'sonner';

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

    // Should NOT contain a data-slot="card" wrapper
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
    expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
    expect(container.querySelector('[data-slot="card-title"]')).toBeNull();
  });
});
