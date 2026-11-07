import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockedScreen } from './BlockedScreen';
import type { GateStatus } from '../services/electronClient';

const baseGate: GateStatus = {
  status: 'BLOCKED',
  code: 'NO_LAN_ROUTE',
  message: 'Error interno con ruta \\\\servidor\\share\\config.json',
  source: 'unc',
  configPath: '\\\\servidor\\share\\config.json',
};

describe('BlockedScreen', () => {
  it('muestra título, pasos y código sin filtrar datos internos', () => {
    render(
      <BlockedScreen gate={baseGate} onRetry={() => {}} isRetrying={false} />,
    );

    expect(
      screen.getByRole('heading', { name: /sin acceso a la red corporativa/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /qué podés hacer/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/conectate al cable/i)).toBeInTheDocument();
    expect(screen.getByText(/NO_LAN_ROUTE/)).toBeInTheDocument();

    expect(screen.queryByText(/\\\\servidor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/config\.json/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unc/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error interno/i)).not.toBeInTheDocument();
  });

  it.each([
    ['NO_CONFIG', /falta la configuración corporativa/i],
    ['BAD_CONFIG', /tiene un problema/i],
    ['NO_PERMISSION', /tu usuario no tiene acceso/i],
    ['NO_LAN_TIMEOUT', /no respondió/i],
    ['NO_LAN_DNS', /no encontramos la configuración/i],
    ['UNKNOWN', /no pudimos verificar/i],
  ] as const)('mapea el código %s a un título útil', (code, title) => {
    render(
      <BlockedScreen
        gate={{
          ...baseGate,
          code,
          status:
            code === 'NO_CONFIG' || code === 'BAD_CONFIG'
              ? 'NO_CONFIG'
              : 'BLOCKED',
        }}
        onRetry={() => {}}
        isRetrying={false}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument();
  });

  it('dispara el reintento al presionar el botón', () => {
    const onRetry = vi.fn();
    render(
      <BlockedScreen gate={baseGate} onRetry={onRetry} isRetrying={false} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón mientras reintenta', () => {
    render(
      <BlockedScreen gate={baseGate} onRetry={() => {}} isRetrying={true} />,
    );

    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
  });
});
