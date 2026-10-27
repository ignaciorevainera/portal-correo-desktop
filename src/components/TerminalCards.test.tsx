import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HardwareCard } from './HardwareCard';
import { NetworkAdCard } from './NetworkAdCard';
import { QuickActionsBar } from './QuickActionsBar';
import { getAllTerminals } from '../services/terminalService';

const mockTerm = getAllTerminals()[0];

describe('Terminal Inventory & Actions components', () => {
  it('renders HardwareCard with system details', () => {
    render(<HardwareCard terminal={mockTerm} />);
    expect(screen.getByText(/windows 10/i)).toBeInTheDocument();
    expect(screen.getByText(/8.192 MB/i)).toBeInTheDocument();
  });

  it('renders NetworkAdCard with IP, MAC and userNt', () => {
    render(<NetworkAdCard terminal={mockTerm} />);
    expect(screen.getByText(mockTerm.ip)).toBeInTheDocument();
    expect(screen.getByText(mockTerm.mac)).toBeInTheDocument();
    expect(screen.getByText(/operadordemo01/i)).toBeInTheDocument();
  });

  it('triggers quick action callbacks when clicking buttons', () => {
    const onVnc = vi.fn();
    const onMsra = vi.fn();
    const onPing = vi.fn();

    render(
      <QuickActionsBar
        terminal={mockTerm}
        isPinging={false}
        onLaunchVnc={onVnc}
        onLaunchMsra={onMsra}
        onTogglePing={onPing}
      />
    );

    // Primary CTA triggers VNC (or smart remote)
    fireEvent.click(screen.getByRole('button', { name: /conexión remota inteligente/i }));
    expect(onVnc).toHaveBeenCalled();

    // Dropdown allows forcing MSRA
    fireEvent.click(screen.getByRole('button', { name: /opciones de conexión remota/i }));
    fireEvent.click(screen.getByRole('button', { name: /iniciar asistencia msra/i }));
    expect(onMsra).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^iniciar ping$/i }));
    expect(onPing).toHaveBeenCalled();
  });
});
