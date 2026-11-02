import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        onSmartRemote={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('opens the terminal by clicking the card and connects remotely from one button', async () => {
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
    const onRemoteMock = vi.fn().mockResolvedValue(undefined);

    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={onSelectMock}
        onSmartRemote={onRemoteMock}
      />
    );

    expect(screen.getByText('Escáner de Subred')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.0/24')).toBeInTheDocument();
    expect(screen.getByText('PC-SUCURSAL-01')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.15')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /consultar pc-sucursal-01/i })
    );
    expect(onSelectMock).toHaveBeenCalledWith('PC-SUCURSAL-01');

    expect(screen.queryByText('VNC')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Consultar$/i })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /conexión remota a pc-sucursal-01/i })
    );
    await waitFor(() =>
      expect(onRemoteMock).toHaveBeenCalledWith('192.0.2.15')
    );

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
        onSmartRemote={vi.fn()}
      />
    );

    expect(screen.getAllByText('192.0.2.77')).toHaveLength(1);

    fireEvent.click(
      screen.getByRole('button', { name: /consultar 192.0.2.77/i })
    );
    expect(onSelectMock).toHaveBeenCalledWith('192.0.2.77');

    spyScanner.mockRestore();
  });
});
