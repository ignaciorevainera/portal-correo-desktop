import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SecurityLockScreen } from './SecurityLockScreen';
import { SecurityGateStatus } from '../services/electronClient';

describe('SecurityLockScreen component', () => {
  const blockedStatus: SecurityGateStatus = {
    authorized: false,
    configured: false,
    domainMatched: false,
    networkReachable: false,
    detectedDomain: 'WORKGROUP',
    reason: 'UNCONFIGURED',
    message: 'Aplicativo sin configuración corporativa.',
  };

  it('renders diagnostic status and blocks access message', () => {
    render(
      <SecurityLockScreen
        status={blockedStatus}
        onUnlock={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText(/Control de Acceso Corporativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Aplicativo sin configuración corporativa/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin vincular/i)).toBeInTheDocument();
    expect(screen.getByText(/Externo \(WORKGROUP\)/i)).toBeInTheDocument();
  });

  it('submits UNC config path and corporate key on form submission', () => {
    const onUnlock = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn().mockResolvedValue(undefined);

    render(
      <SecurityLockScreen
        status={blockedStatus}
        onUnlock={onUnlock}
        onRetry={onRetry}
      />
    );

    const pathInput = screen.getByPlaceholderText(/\\\\SERVIDOR-INTERNO\\Compartido\\cmda\.config\.json/i);
    const keyInput = screen.getByPlaceholderText(/Ingrese la clave corporativa/i);

    fireEvent.change(pathInput, { target: { value: '\\\\NAS-CORP\\cmda\\cmda.config.json' } });
    fireEvent.change(keyInput, { target: { value: 'ClaveSecreta2026' } });

    const unlockBtn = screen.getByRole('button', { name: /Desbloquear y Verificar Entorno/i });
    fireEvent.click(unlockBtn);

    expect(onUnlock).toHaveBeenCalledWith('\\\\NAS-CORP\\cmda\\cmda.config.json', 'ClaveSecreta2026');
  });
});
