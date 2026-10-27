import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Topbar } from '../components/Topbar';
import { TerminalIdentity } from '../components/TerminalIdentity';
import { TerminalDetailsGrid } from '../components/TerminalDetailsGrid';
import { ThemeProvider } from '../context/ThemeContext';
import { getAllTerminals } from '../services/terminalService';

describe('Phase 1 Tests: Draggable Brand Region and Terminal Identity', () => {
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

  it('renders identity and details with one-click copy for IP and MAC', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <>
        <TerminalIdentity terminal={terminal} />
        <TerminalDetailsGrid terminal={terminal} />
      </>,
    );

    expect(screen.getByText(terminal.os)).toBeInTheDocument();
    expect(screen.getByText(terminal.ram)).toBeInTheDocument();
    expect(screen.getByText(terminal.ip)).toBeInTheDocument();
    expect(screen.getByText(terminal.mac)).toBeInTheDocument();
    expect(screen.getByText(terminal.location as string)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar IP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar MAC' }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(terminal.ip);
      expect(writeTextMock).toHaveBeenCalledWith(terminal.mac);
    });
  });
});
