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
        onLaunchRemote={vi.fn()}

      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render drawer and start scanner, selecting terminal on card click and connecting remotely on monitor button click', () => {

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
    const onRemoteMock = vi.fn();


    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={onSelectMock}
        onLaunchRemote={onRemoteMock}

      />
    );

    expect(screen.getByText('Escáner de Subred')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.0/24')).toBeInTheDocument();
    expect(screen.getByText('PC-SUCURSAL-01')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.15')).toBeInTheDocument();

    // Redundant "Consultar" button is removed; clicking the card consults the terminal
    expect(screen.queryByText('Consultar')).toBeNull();
    const hostCard = screen.getByRole('button', { name: /consultar terminal pc-sucursal-01/i });
    fireEvent.click(hostCard);
    expect(onSelectMock).toHaveBeenCalledWith('PC-SUCURSAL-01');

    // Monitor icon button triggers remote smart connection
    const monitorBtn = screen.getByRole('button', { name: /conexión remota rápida con pc-sucursal-01/i });
    fireEvent.click(monitorBtn);
    expect(onRemoteMock).toHaveBeenCalledWith('PC-SUCURSAL-01');

    // The card container uses neutral hover and does not have primary-colored hover tint
    const cardContainer = hostCard.closest('.flex.items-stretch');
    expect(cardContainer).toBeInTheDocument();
    expect(cardContainer?.className).toContain('hover:border-border');
    expect(cardContainer?.className).not.toContain('border-primary');
    expect(cardContainer?.className).not.toContain('hover:bg-accent');
    // Monitor button occupies reserved end portion
    expect(monitorBtn.className).toContain('w-10');

    spyScanner.mockRestore();
  });

  it('shows the IP once when no hostname can be resolved and clicking card consults IP', () => {
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

    const hostCard = screen.getByRole('button', { name: /consultar terminal 192.0.2.77/i });
    fireEvent.click(hostCard);

    expect(onSelectMock).toHaveBeenCalledWith('192.0.2.77');

    spyScanner.mockRestore();
  });

  it('pauses scan without closing drawer when clicking Pausar, and stops spinning animation', () => {
    const mockCleanup = vi.fn();
    const spyScanner = vi.spyOn(electronClient, 'startSubnetScanner').mockImplementation(
      (_targetIp, _onHostFound, onProgress) => {
        onProgress({ scanned: 50, total: 254 });
        return mockCleanup;
      }
    );

    const onCloseMock = vi.fn();

    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={onCloseMock}
        targetIp="192.0.2.50"
        onSelectTerminal={vi.fn()}
      />
    );

    // Initial state: scanning
    expect(screen.getByText('Escaneando hosts...')).toBeInTheDocument();
    const pauseBtn = screen.getByRole('button', { name: /pausar escaneo/i });
    fireEvent.click(pauseBtn);

    // Drawer must NOT be closed!
    expect(onCloseMock).not.toHaveBeenCalled();
    expect(mockCleanup).toHaveBeenCalled();

    // Status is paused, spinner is gone
    expect(screen.getAllByText('Escaneo en pausa').length).toBeGreaterThan(0);
    expect(screen.queryByText('Escaneando hosts...')).toBeNull();

    // Shows Reanudar button
    const resumeBtn = screen.getByRole('button', { name: /reanudar escaneo/i });
    expect(resumeBtn).toBeInTheDocument();

    // Clicking Reanudar restarts scan from paused index (50)
    fireEvent.click(resumeBtn);
    expect(spyScanner).toHaveBeenLastCalledWith(
      '192.0.2.50',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      50
    );

    spyScanner.mockRestore();
  });

  it('el filtro usa la primitiva Input', () => {
    render(
      <SubnetScannerDrawer
        isOpen
        onClose={vi.fn()}
        targetIp="10.0.0.5"
        onSelectTerminal={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText(/Filtrar equipos/i)).toHaveAttribute(
      'data-slot',
      'input',
    );
  });
});
