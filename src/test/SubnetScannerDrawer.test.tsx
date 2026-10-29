import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SubnetScannerDrawer } from '../components/SubnetScannerDrawer';
import * as electronClient from '../services/electronClient';

describe('SubnetScannerDrawer Component', () => {
  it('should not render anything when isOpen is false', () => {
    const { container } = render(
      <SubnetScannerDrawer
        isOpen={false}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={vi.fn()}
        onLaunchVnc={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render drawer and start scanner when isOpen is true', () => {
    const mockCleanup = vi.fn();
    const spyScanner = vi.spyOn(electronClient, 'startSubnetScanner').mockImplementation(
      (_targetIp, onHostFound, onProgress, onDone) => {
        onProgress({ scanned: 100, total: 254 });
        onHostFound({
          ip: '192.0.2.15',
          hostname: 'PC-SUCURSAL-01',
          alive: true,
          latency: 12,
        });
        onDone({ aborted: false, totalFound: 1 });
        return mockCleanup;
      }
    );

    const onSelectMock = vi.fn();
    const onVncMock = vi.fn();

    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={onSelectMock}
        onLaunchVnc={onVncMock}
      />
    );

    expect(screen.getByText('Escáner de Subred')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.0/24')).toBeInTheDocument();
    expect(screen.getByText('PC-SUCURSAL-01')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.15')).toBeInTheDocument();

    const consultBtn = screen.getByText('Consultar');
    fireEvent.click(consultBtn);
    expect(onSelectMock).toHaveBeenCalledWith('PC-SUCURSAL-01');

    const vncBtn = screen.getByText('VNC');
    fireEvent.click(vncBtn);
    expect(onVncMock).toHaveBeenCalledWith('192.0.2.15');

    spyScanner.mockRestore();
  });

  it('shows the IP once when no hostname can be resolved', () => {
    const spyScanner = vi.spyOn(electronClient, 'startSubnetScanner').mockImplementation(
      (_targetIp, onHostFound, onProgress, onDone) => {
        onProgress({ scanned: 254, total: 254 });
        onHostFound({
          ip: '192.0.2.77',
          hostname: null,
          alive: true,
          latency: 9,
        });
        onDone({ aborted: false, totalFound: 1 });
        return vi.fn();
      }
    );

    const onSelectMock = vi.fn();

    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={onSelectMock}
        onLaunchVnc={vi.fn()}
      />
    );

    expect(screen.getAllByText('192.0.2.77')).toHaveLength(1);

    fireEvent.click(screen.getByText('Consultar'));
    expect(onSelectMock).toHaveBeenCalledWith('192.0.2.77');

    spyScanner.mockRestore();
  });
});
