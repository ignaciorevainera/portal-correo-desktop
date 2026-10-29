import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Topbar } from '../components/Topbar';
import { ThemeProvider } from '../context/ThemeContext';

const RECENT_KEY = 'pcd_recent_searches';

describe('Topbar Search and Keyboard Navigation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders recent searches on focus when query is empty and navigates with Arrow keys', () => {
    const mockSearches = ['SUC10-PC01', 'SUC10-PC02', 'SUC20-PC03'];
    localStorage.setItem(RECENT_KEY, JSON.stringify(mockSearches));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal o ip/i);
    expect(screen.queryByText('SUC10-PC01')).not.toBeInTheDocument();

    // Focusing the input triggers the dropdown with the recent searches
    fireEvent.focus(searchInput);
    expect(screen.getByText('SUC10-PC01')).toBeInTheDocument();
    expect(screen.getByText('SUC10-PC02')).toBeInTheDocument();
    expect(screen.getByText('SUC20-PC03')).toBeInTheDocument();

    // Arrow down selects first item
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    // Arrow down selects second item
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    // Pressing Enter activates the selected item
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectTerminal).toHaveBeenCalledWith('SUC10-PC02');
  });

  it('navigates with ArrowUp in wrap-around manner', () => {
    const mockSearches = ['PC-A', 'PC-B'];
    localStorage.setItem(RECENT_KEY, JSON.stringify(mockSearches));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal o ip/i);
    fireEvent.focus(searchInput);

    // Arrow up wraps around to last item (PC-B)
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onSelectTerminal).toHaveBeenCalledWith('PC-B');
  });
});
