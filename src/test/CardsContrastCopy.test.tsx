import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HardwareCard } from '../components/HardwareCard';
import { NetworkAdCard } from '../components/NetworkAdCard';
import { getAllTerminals } from '../services/terminalService';

describe('Cards High Contrast & 1-Click Copy Tests', () => {
  const terminal = getAllTerminals()[0];

  it('renders HardwareCard with high-contrast text and 1-click copy for CPU Model', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<HardwareCard terminal={terminal} />);

    expect(screen.getByText(/ficha técnica & sistema/i)).toBeInTheDocument();
    expect(screen.getByText(terminal.os)).toBeInTheDocument();

    const copyCpuBtn = screen.getByRole('button', { name: /copiar modelo y cpu/i });
    expect(copyCpuBtn).toBeInTheDocument();

    fireEvent.click(copyCpuBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.cpuModel);
    await waitFor(() => {
      expect(screen.getByText(/copiado/i)).toBeInTheDocument();
    });
  });

  it('renders NetworkAdCard with 1-click copy buttons for IP, MAC and UserNT', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<NetworkAdCard terminal={terminal} />);

    const copyIpBtn = screen.getByRole('button', { name: /copiar dirección ipv4/i });
    const copyMacBtn = screen.getByRole('button', { name: /copiar dirección mac/i });
    const copyUserBtn = screen.getByRole('button', { name: /copiar usuario nt/i });

    expect(copyIpBtn).toBeInTheDocument();
    expect(copyMacBtn).toBeInTheDocument();
    expect(copyUserBtn).toBeInTheDocument();

    fireEvent.click(copyIpBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.ip);

    fireEvent.click(copyMacBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.mac);

    fireEvent.click(copyUserBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.userNt);
  });
});
