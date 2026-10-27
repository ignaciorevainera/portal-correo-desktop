import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalIdentity } from '../components/TerminalIdentity';
import { TerminalDetailsGrid } from '../components/TerminalDetailsGrid';
import { SubnetScannerDrawer } from '../components/SubnetScannerDrawer';
import { TerminalData } from '../types/terminal';

const mockTerminalWithMissingFields: TerminalData = {
  pc: 'SUC99-TEST',
  ip: '192.0.2.200',
  mac: '',
  os: 'Windows 10',
  servicePack: '',
  cpuModel: '',
  ram: '',
  antivirusVersion: '',
  ieVersion: '',
  userNt: '',
  architecture: '',
  surveyDate: '',
  location: '',
  costCenter: '',
  alerts: [],
  resetHistory: [],
  uptimeText: '1 día',
};

describe('Terminal identity, details grid & SubnetScannerDrawer polish', () => {
  it('falls back gracefully for empty fields without blank values', () => {
    render(
      <>
        <TerminalIdentity terminal={mockTerminalWithMissingFields} />
        <TerminalDetailsGrid terminal={mockTerminalWithMissingFields} />
      </>,
    );

    expect(screen.getAllByText('No informado').length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole('heading', { name: 'SUC99-TEST' })).toBeInTheDocument();
    expect(screen.getByText('Sede no especificada')).toBeInTheDocument();
    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
  });

  it('renders SubnetScannerDrawer with backdrop', () => {
    const { container } = render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.200"
        onSelectTerminal={vi.fn()}
        onLaunchVnc={vi.fn()}
      />,
    );

    expect(container.querySelector('aside')).not.toBeNull();
    expect(container.querySelector('.fixed.inset-0.z-50')).toBeInTheDocument();
  });
});
