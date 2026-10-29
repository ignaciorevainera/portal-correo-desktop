import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockedScreen } from './BlockedScreen';
import type { GateStatus } from '../services/electronClient';

const gateBloqueado: GateStatus = {
  status: 'BLOCKED',
  code: 'NO_LAN_ROUTE',
  message: 'Esta aplicación solo funciona dentro de la red corporativa.',
  source: 'unc',
  configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
};

describe('BlockedScreen', () => {
  it('muestra el mensaje del gate y el código de diagnóstico', () => {
    render(<BlockedScreen gate={gateBloqueado} onRetry={() => {}} isRetrying={false} />);

    expect(screen.getByText(/solo funciona dentro de la red corporativa/i)).toBeInTheDocument();
    expect(screen.getByText(/NO_LAN_ROUTE/)).toBeInTheDocument();
  });

  it('dispara el reintento al presionar el botón', () => {
    const onRetry = vi.fn();
    render(<BlockedScreen gate={gateBloqueado} onRetry={onRetry} isRetrying={false} />);

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón mientras reintenta', () => {
    render(<BlockedScreen gate={gateBloqueado} onRetry={() => {}} isRetrying={true} />);

    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
  });
});
