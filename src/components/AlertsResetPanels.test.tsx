import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AlertsPanel } from './AlertsPanel';
import { ResetUptimePanel } from './ResetUptimePanel';
import { getAllTerminals } from '../services/terminalService';

describe('Alerts and Reset Panels', () => {
  it('renders AlertsPanel with existing alerts and allows submitting a new alert', () => {
    const term = getAllTerminals()[1]; // WS-DEMO-002 has 1 alert
    const onAdd = vi.fn();
    const onClose = vi.fn();

    render(
      <AlertsPanel
        terminal={term}
        onAddAlert={onAdd}
        onCloseAlert={onClose}
      />
    );

    expect(screen.getByText(/Mantenimiento Preventivo Pendiente/i)).toBeInTheDocument();

    // Open form
    fireEvent.click(screen.getByRole('button', { name: /nueva alerta/i }));

    // Fill form and submit
    fireEvent.change(screen.getByPlaceholderText(/título de la alerta/i), {
      target: { value: 'Nueva Alerta Test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/descripción detallada/i), {
      target: { value: 'Detalle de la prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: /registrar alerta/i }));

    expect(onAdd).toHaveBeenCalledWith({
      title: 'Nueva Alerta Test',
      description: 'Detalle de la prueba',
      operator: expect.any(String),
    });
  });

  it('renders ResetUptimePanel with uptime and reset entries', () => {
    const term = getAllTerminals()[0]; // PC-DEMO-001
    render(<ResetUptimePanel terminal={term} />);

    expect(screen.getByText(/12 day\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Desbloqueo de clave/i)).toBeInTheDocument();
  });
});
