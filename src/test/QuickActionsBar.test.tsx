import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar, ActionFeedbackState } from '../components/QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';

describe('QuickActionsBar Inline Feedback & Shortcut Keys', () => {
  const terminal = getAllTerminals()[0];

  it('renders default quick actions and Uptime metric', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /conectar por vnc viewer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar asistencia msra/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar ping continuo/i })).toBeInTheDocument();
    expect(screen.getByText(/uptime/i)).toBeInTheDocument();
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
});
