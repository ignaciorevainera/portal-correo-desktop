import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Topbar } from './Topbar';
import { ThemeProvider } from '../context/ThemeContext';

describe('Topbar & Search component', () => {
  it('renders search input and shortcut indicator', () => {
    const handleSelect = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={handleSelect} selectedPc="PC-DEMO-001" />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    expect(input).toBeInTheDocument();
  });

  it('filters and selects a terminal from quick suggestions', () => {
    const handleSelect = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={handleSelect} selectedPc="" />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    fireEvent.change(input, { target: { value: 'WS-DEMO' } });

    const suggestion = screen.getByText(/WS-DEMO-002/i);
    expect(suggestion).toBeInTheDocument();

    fireEvent.click(suggestion);
    expect(handleSelect).toHaveBeenCalledWith('WS-DEMO-002');
  });

  it('opens and closes the info modal on button click', () => {
    const handleSelect = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={handleSelect} selectedPc="PC-DEMO-001" />
      </ThemeProvider>
    );

    const infoBtn = screen.getByRole('button', { name: /abrir información del sistema/i });
    expect(infoBtn).toBeInTheDocument();

    fireEvent.click(infoBtn);
    expect(screen.getByText(/acerca de new cmda/i)).toBeInTheDocument();
    expect(screen.getByText(/v1.0.0/i)).toBeInTheDocument();
    expect(screen.getByText(/búsqueda inteligente/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/acerca de new cmda/i)).not.toBeInTheDocument();
  });
});
