import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { SubnetScannerDrawer } from '../components/SubnetScannerDrawer';
import * as electronClient from '../services/electronClient';

describe('SubnetScannerDrawer Performance & 2-Phase Host Discovery', () => {
  it('updates host in-place when hostname resolves asynchronously (phase 2) without duplicating cards', async () => {
    let emitHostFound: ((host: electronClient.SubnetDiscoveredHost) => void) | null = null;

    vi.spyOn(electronClient, 'startSubnetScanner').mockImplementation(
      (_targetIp, onHostFound) => {
        emitHostFound = onHostFound;
        return vi.fn();
      }
    );

    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={vi.fn()}
      />
    );

    // Phase 1: host discovered alive with hostname: null
    act(() => {
      emitHostFound?.({
        ip: '192.0.2.99',
        hostname: null,
        alive: true,
        latency: 14,
      });
    });

    // Should render 1 card with IP
    expect(screen.getByText('192.0.2.99')).toBeInTheDocument();
    expect(screen.queryByText('PC-RESOLVED-FINALLY')).toBeNull();

    // Phase 2: DNS finishes, emitting update for same IP
    act(() => {
      emitHostFound?.({
        ip: '192.0.2.99',
        hostname: 'PC-RESOLVED-FINALLY',
        alive: true,
        latency: 14,
      });
    });

    // Should now show resolved hostname and IP, but strictly 1 card total
    expect(screen.getByText('PC-RESOLVED-FINALLY')).toBeInTheDocument();
    expect(screen.getByText('192.0.2.99')).toBeInTheDocument();

    const hostButtons = screen.getAllByRole('button', { name: /consultar terminal/i });
    expect(hostButtons).toHaveLength(1);
  });

  it('preserves existing cards when an update for an unchanged host arrives', () => {
    let emitHostFound: ((host: electronClient.SubnetDiscoveredHost) => void) | null = null;

    vi.spyOn(electronClient, 'startSubnetScanner').mockImplementation(
      (_targetIp, onHostFound) => {
        emitHostFound = onHostFound;
        return vi.fn();
      }
    );

    render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={vi.fn()}
      />
    );

    act(() => {
      emitHostFound?.({
        ip: '192.0.2.101',
        hostname: 'PC-101',
        alive: true,
        latency: 5,
      });
    });

    expect(screen.getByText('PC-101')).toBeInTheDocument();

    // Duplicate identical emission
    act(() => {
      emitHostFound?.({
        ip: '192.0.2.101',
        hostname: 'PC-101',
        alive: true,
        latency: 5,
      });
    });

    const hostButtons = screen.getAllByRole('button', { name: /consultar terminal/i });
    expect(hostButtons).toHaveLength(1);
  });
});
