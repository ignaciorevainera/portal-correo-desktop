import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Topbar } from './Topbar';
import { ThemeProvider } from '../context/ThemeContext';
import * as electronClient from '../services/electronClient';

describe('Topbar & Compact Unified Titlebar component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search input, brand and compact layout', () => {
    const handleSelect = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={handleSelect} selectedPc="PC-DEMO-001" />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/new cmda/i)).toBeInTheDocument();
  });

  it('renders "Portal MDA" button and calls openExternalUrl with exact URL', async () => {
    const openSpy = vi.spyOn(electronClient, 'openExternalUrl').mockResolvedValue();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc="PC-DEMO-001" />
      </ThemeProvider>
    );

    const portalBtn = screen.getByRole('button', { name: /portal mda/i });
    expect(portalBtn).toBeInTheDocument();

    fireEvent.click(portalBtn);
    expect(openSpy).toHaveBeenCalledWith('https://mda.corporativo.internal/inventario-terminales');
  });

  it('renders window control buttons and invokes IPC actions', async () => {
    const minSpy = vi.spyOn(electronClient, 'minimizeWindow').mockResolvedValue();
    const maxSpy = vi.spyOn(electronClient, 'maximizeWindow').mockResolvedValue();
    const closeSpy = vi.spyOn(electronClient, 'closeWindow').mockResolvedValue();

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc="PC-DEMO-001" />
      </ThemeProvider>
    );

    const minBtn = screen.getByRole('button', { name: /minimizar ventana/i });
    const maxBtn = screen.getByRole('button', { name: /maximizar ventana/i });
    const closeBtn = screen.getByRole('button', { name: /cerrar ventana/i });

    expect(minBtn).toBeInTheDocument();
    expect(maxBtn).toBeInTheDocument();
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(minBtn);
    expect(minSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(maxBtn);
    expect(maxSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(closeBtn);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('provides direct 1-click VNC and Ping actions on search suggestions', () => {
    const handleSelect = vi.fn();
    const handleDirectVnc = vi.fn();
    const handleDirectPing = vi.fn();

    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={handleSelect}
          onDirectVnc={handleDirectVnc}
          onDirectPing={handleDirectPing}
          selectedPc=""
        />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    fireEvent.change(input, { target: { value: 'WS-DEMO' } });

    const suggestion = screen.getByText(/WS-DEMO-002/i);
    expect(suggestion).toBeInTheDocument();

    const vncQuickBtn = screen.getByRole('button', { name: /conectar vnc a ws-demo-002/i });
    const pingQuickBtn = screen.getByRole('button', { name: /ping a ws-demo-002/i });

    expect(vncQuickBtn).toBeInTheDocument();
    expect(pingQuickBtn).toBeInTheDocument();

    fireEvent.click(vncQuickBtn);
    expect(handleDirectVnc).toHaveBeenCalledWith('WS-DEMO-002');

    fireEvent.click(pingQuickBtn);
    expect(handleDirectPing).toHaveBeenCalledWith('WS-DEMO-002');
  });
});
