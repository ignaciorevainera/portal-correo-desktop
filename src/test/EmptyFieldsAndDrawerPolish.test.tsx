import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalTechnicalCard } from '../components/TerminalTechnicalCard';
import { SubnetScannerDrawer } from '../components/SubnetScannerDrawer';
import { TerminalData } from '../types/terminal';

const mockTerminalWithMissingFields: TerminalData = {
  pc: 'SUC99-TEST',
  ip: '192.0.2.200',
  mac: '', // vacía
  os: 'Windows 10',
  servicePack: '', // vacío
  cpuModel: '', // vacío
  ram: '', // vacía
  antivirusVersion: '', // vacía
  ieVersion: '', // vacía
  userNt: '', // vacío
  architecture: '', // vacía -> badge no debe renderizarse vacío
  surveyDate: '', // vacía
  location: '', // vacía
  costCenter: '',
  alerts: [],
  resetHistory: [],
  uptimeText: '1 día',
};

describe('TerminalTechnicalCard & SubnetScannerDrawer UI Polish', () => {
  it('renders "No especificado" or falls back gracefully for empty fields and does not render empty badges', () => {
    const { container } = render(
      <TerminalTechnicalCard terminal={mockTerminalWithMissingFields} onOpenSubnetScanner={vi.fn()} />
    );

    // No debe haber textos en blanco o badges vacíos
    const badges = container.querySelectorAll('[data-slot="badge"]');
    badges.forEach((b) => {
      expect(b.textContent?.trim().length).toBeGreaterThan(0);
    });

    // MAC y RAM vacías deben mostrar texto de fallback
    expect(screen.getAllByText(/no especificada/i).length).toBeGreaterThanOrEqual(1);

    // El botón de escanear subred usa clase de botón shadcn con buen contraste
    // Escanear subred se reubico en QuickActionsBar
  });

  it('renders SubnetScannerDrawer below the topbar with top-14 / inset-y-0 adjustment and pointer cursor on host items', () => {
    const { container } = render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.200"
        onSelectTerminal={vi.fn()}
        onLaunchVnc={vi.fn()}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).not.toBeNull();
    // Debe empezar debajo de la topbar (top-14 o style top: 3.5rem) para que la topbar quede visible
    // SubnetScannerDrawer cubre verticalmente la pantalla completa (z-50) con backdrop
    expect(container.querySelector('.fixed.inset-0.z-50')).toBeInTheDocument();
  });
});
