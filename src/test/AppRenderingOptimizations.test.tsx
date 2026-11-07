import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { Topbar } from '../components/Topbar';
import { ThemeProvider } from '../context/ThemeContext';
import * as terminalService from '../services/terminalService';
import * as electronClient from '../services/electronClient';

describe('App Rendering & Software-Rasterization Optimizations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(electronClient, 'checkSecurityGateStatus').mockResolvedValue({
      status: 'READY',
      source: 'unc',
      target: '\\\\mock\\config.json',
    });
    vi.spyOn(electronClient, 'checkBackendStatus').mockResolvedValue({
      ok: true,
      poolSize: 1,
      lastCheck: new Date().toISOString(),
    });
  });

  it('does NOT invoke getAllTerminals on initial render of App', async () => {
    const getAllSpy = vi.spyOn(terminalService, 'getAllTerminals');

    await act(async () => {
      render(<App />);
    });

    // In previous versions, getAllTerminals() was called on every render pass
    expect(getAllSpy).not.toHaveBeenCalled();
  });

  it('removes CPU-heavy backdrop-blur from Topbar header element to optimize software rendering', () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar
          onSearch={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenSubnetScanner={vi.fn()}
          searchError={null}
          backendStatus={{ ok: true, poolSize: 1, lastCheck: '' }}
        />
      </ThemeProvider>
    );

    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header?.className).not.toContain('backdrop-blur');
    expect(header?.className).toContain('bg-card');
  });
});
