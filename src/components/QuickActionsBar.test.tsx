import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickActionsBar } from './QuickActionsBar';
import { TerminalData } from '../types/terminal';

describe('QuickActionsBar Polish: Subnet Scanner & Uptime Refresh', () => {
  const terminal: TerminalData = {
    id: 'test-1',
    pc: 'PC-TEST-001',
    ip: '192.0.2.100',
    mac: '00:11:22:33:44:55',
    os: 'Windows 10',
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

    const scanBtn = screen.getByRole('button', { name: /escanear subred/i });
    expect(scanBtn).toBeInTheDocument();
    fireEvent.click(scanBtn);
    expect(onOpenSubnet).toHaveBeenCalledTimes(1);
  });

  it('renders Uptime card with refresh button and handles clicking refresh', () => {
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

    expect(screen.getByText(/uptime/i)).toBeInTheDocument();
    expect(screen.getByText(terminal.uptimeText)).toBeInTheDocument();

    const refreshBtn = screen.getByRole('button', { name: /refrescar uptime/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    expect(onRefreshUptime).toHaveBeenCalledTimes(1);
  });
});
