import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertsPanel } from '../components/AlertsPanel';
import { ResetUptimePanel } from '../components/ResetUptimePanel';
import App from '../App';
import { TerminalData } from '../types/terminal';

const mockTerminal: TerminalData = {
  pc: 'SUC01-POS01',
  ip: '192.0.2.100',
  userNt: 'OPERADOR01',
  description: 'Sucursal Central 01',
  centroCostos: 'CC-1044',
  marcaModelo: 'HP EliteDesk 800 G4',
  mac: '00:1A:2B:3C:4D:5E',
  so: 'Windows 10 Pro 64-bit',
  memoria: '16 GB DDR4',
  cpu: 'Intel Core i5-8500 @ 3.00GHz',
  mother: 'HP 83B4',
  disco: '480 GB SSD Kingston',
  vncPass: 'password123',
  vncType: 'TightVNC',
  sucursal: 'Sucursal 01 - Centro',
  antivirus: 'Windows Defender',
  alerts: [
    {
      id: 'al-1',
      title: 'Falla térmica cooler',
      description: 'Ruido excesivo y temperatura alta reportada',
      date: '2026-10-24 14:30',
      operator: 'JRevainera',
      active: true,
    },
    {
      id: 'al-2',
      title: 'Impresora térmica desconectada',
      description: 'Se cambió el cable USB y volvió a operar',
      date: '2026-10-20 09:15',
      operator: 'MGomez',
      active: false,
      resolutionText: 'Reemplazado cable USB por nuevo stock',
    },
  ],
  uptimeText: '14 días, 6 horas, 22 minutos',
};

describe('AlertsPanel & ResetUptimePanel UI refinements', () => {
  it('renders AlertsPanel without decorative header icon and in tabular layout', () => {
    const handleAdd = vi.fn();
    const handleClose = vi.fn();

    const { container } = render(
      <AlertsPanel
        terminal={mockTerminal}
        onAddAlert={handleAdd}
        onCloseAlert={handleClose}
      />
    );

    // Section header has title text but NO svg icon in the title heading
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Alertas de Terminal (SUC01-POS01)');
    expect(heading.querySelector('svg')).toBeNull();

    // Table elements are present
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(screen.getByText('Falla térmica cooler')).toBeDefined();
    expect(screen.getByText('Impresora térmica desconectada')).toBeDefined();
    expect(screen.getByText('JRevainera')).toBeDefined();
    expect(screen.getByText('MGomez')).toBeDefined();

    // Action button to close active alert
    const closeBtn = screen.getByRole('button', { name: /cerrar/i });
    expect(closeBtn).toBeDefined();
  });

  it('renders ResetUptimePanel without decorative icon in section header', () => {
    render(<ResetUptimePanel terminal={mockTerminal} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Reseteo de Cuentas & Historial de Uptime (SUC01-POS01)');
    expect(heading.querySelector('svg')).toBeNull();
  });
});
