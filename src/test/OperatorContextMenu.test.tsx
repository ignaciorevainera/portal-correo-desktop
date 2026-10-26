import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OperatorContextMenu } from '../components/OperatorContextMenu';
import { getAllTerminals } from '../services/terminalService';

describe('OperatorContextMenu Component', () => {
  const terminal = getAllTerminals()[0];

  it('renders context menu at given position with operator shortcuts and actions', () => {
    const onClose = vi.fn();
    const onLaunchVnc = vi.fn();
    const onTogglePing = vi.fn();
    const onLaunchMsra = vi.fn();
    const onOpenPortalMda = vi.fn();

    render(
      <OperatorContextMenu
        x={120}
        y={150}
        terminal={terminal}
        isPinging={false}
        onClose={onClose}
        onLaunchVnc={onLaunchVnc}
        onTogglePing={onTogglePing}
        onLaunchMsra={onLaunchMsra}
        onOpenPortalMda={onOpenPortalMda}
      />
    );

    expect(screen.getByText('Acciones')).toBeInTheDocument();

    const vncItem = screen.getByRole('button', { name: /conectar vnc/i });
    const pingItem = screen.getByRole('button', { name: /iniciar ping/i });
    const msraItem = screen.getByRole('button', { name: /asistencia msra/i });
    const portalItem = screen.getByRole('button', { name: /abrir portal mda/i });

    expect(vncItem).toBeInTheDocument();
    expect(pingItem).toBeInTheDocument();
    expect(msraItem).toBeInTheDocument();
    expect(portalItem).toBeInTheDocument();

    fireEvent.click(vncItem);
    expect(onLaunchVnc).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(pingItem);
    expect(onTogglePing).toHaveBeenCalledTimes(1);

    fireEvent.click(portalItem);
    expect(onOpenPortalMda).toHaveBeenCalledTimes(1);
  });

  it('allows copying IP and Hostname directly from context menu', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <OperatorContextMenu
        x={100}
        y={100}
        terminal={terminal}
        isPinging={false}
        onClose={vi.fn()}
        onLaunchVnc={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchMsra={vi.fn()}
        onOpenPortalMda={vi.fn()}
      />
    );

    const copyIpBtn = screen.getByRole('button', { name: /copiar ip/i });
    fireEvent.click(copyIpBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.ip);

    const copyHostBtn = screen.getByRole('button', { name: /copiar hostname/i });
    fireEvent.click(copyHostBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.pc);
  });
});
