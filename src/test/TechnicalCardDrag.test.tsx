import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Topbar } from '../components/Topbar';
import { TerminalTechnicalCard } from '../components/TerminalTechnicalCard';
import { ThemeProvider } from '../context/ThemeContext';
import { getAllTerminals } from '../services/terminalService';

describe('Phase 1 Tests: Draggable Brand Region and Unified TerminalTechnicalCard', () => {
  const terminal = getAllTerminals()[0];

  it('allows dragging the window from brand and title container without app-no-drag', () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc="PC-DEMO-001" />
      </ThemeProvider>
    );

    const brandContainer = screen.getByText(/portal correo desktop/i).closest('div');
    expect(brandContainer).not.toBeNull();
    // Must NOT have app-no-drag so it can be dragged along with app-drag-region header
    expect(brandContainer?.className).not.toContain('app-no-drag');
  });

  it('renders TerminalTechnicalCard combining hardware and network into a single high-efficiency card', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<TerminalTechnicalCard terminal={terminal} />);

    // Header without icons
    expect(screen.getByText(/ficha técnica, red y sistema/i)).toBeInTheDocument();

    // Contains Hardware items
    expect(screen.getByText(terminal.os)).toBeInTheDocument();
    expect(screen.getByText(terminal.ram)).toBeInTheDocument();

    // Contains Network items
    expect(screen.getByText(terminal.ip)).toBeInTheDocument();
    expect(screen.getByText(terminal.mac)).toBeInTheDocument();
    if (terminal.location) {
      expect(screen.getByText(terminal.location)).toBeInTheDocument();
    }

    // 1-Click Copy buttons
    const copyIpBtn = screen.getByRole('button', { name: /copiar dirección ipv4/i });
    const copyMacBtn = screen.getByRole('button', { name: /copiar dirección mac/i });
    const copyCpuBtn = screen.getByRole('button', { name: /copiar modelo y cpu/i });
    const copyUserBtn = screen.getByRole('button', { name: /copiar usuario nt/i });

    expect(copyIpBtn).toBeInTheDocument();
    expect(copyMacBtn).toBeInTheDocument();
    expect(copyCpuBtn).toBeInTheDocument();
    expect(copyUserBtn).toBeInTheDocument();

    fireEvent.click(copyIpBtn);
    expect(writeTextMock).toHaveBeenCalledWith(terminal.ip);

    await waitFor(() => {
      expect(screen.getByText(/copiado/i)).toBeInTheDocument();
    });
  });
});
