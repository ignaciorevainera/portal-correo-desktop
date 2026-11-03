import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar } from './QuickActionsBar';
import { TerminalData } from '../types/terminal';

describe('QuickActionsBar Polish: Subnet Scanner & Uptime Refresh', () => {
  const terminal: TerminalData = {
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
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onOpenSubnetScanner={onOpenSubnet}
      />
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
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onRefreshUptime={onRefreshUptime}
        isRefreshingUptime={false}
      />
    );

    expect(screen.getByText(terminal.uptimeText)).toBeInTheDocument();
    expect(screen.getByTitle(/uptime:/i)).toBeInTheDocument();
    expect(screen.getByText(terminal.uptimeText)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /más/i }));

    const refreshBtn = screen.getByRole('button', { name: /refrescar uptime/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    expect(onRefreshUptime).toHaveBeenCalledTimes(1);
  });

  it('muestra el feedback inline cuando recibe actionFeedback', () => {
    render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        actionFeedback={{ type: 'success', message: 'VNC iniciado hacia 10.0.0.5' }}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('VNC iniciado');
  });
});
