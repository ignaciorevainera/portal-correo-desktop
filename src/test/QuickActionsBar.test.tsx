import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar, ActionFeedbackState } from '../components/QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';

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

  it('renders success inline feedback without top banner', () => {
    const feedback: ActionFeedbackState = {
      type: 'success',
      message: 'VNC Viewer iniciado correctamente hacia 192.0.2.101:5901',
    };

    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        actionFeedback={feedback}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.getByText(/VNC Viewer iniciado correctamente/i)).toBeInTheDocument();
  });

  it('substitutes inline feedback with error state, high contrast and fallback action', () => {
    const onFallbackMsra = vi.fn();
    const feedback: ActionFeedbackState = {
      type: 'error',
      message: 'Puertos VNC (5901/5900) cerrados en 192.0.2.101',
      fallbackAction: {
        label: 'Conectar por MSRA',
        onClick: onFallbackMsra,
      },
    };

    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        actionFeedback={feedback}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    const errorMsg = screen.getByText(/Puertos VNC \(5901\/5900\) cerrados/i);
    expect(errorMsg).toBeInTheDocument();

    const fallbackBtn = screen.getByRole('button', { name: /conectar por msra/i });
    expect(fallbackBtn).toBeInTheDocument();

    fireEvent.click(fallbackBtn);
    expect(onFallbackMsra).toHaveBeenCalledTimes(1);
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
