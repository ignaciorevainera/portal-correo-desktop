import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar, ActiveTab } from '../components/Sidebar';

describe('Sidebar Compact Fixed Component', () => {
  it('renders centered square buttons without extra right space when collapsed', () => {
    const onTabChange = vi.fn();
    const onToggleCollapse = vi.fn();

    const { container } = render(
      <Sidebar
        activeTab="inventory"
        onTabChange={onTabChange}
        collapsed={true}
        onToggleCollapse={onToggleCollapse}
        activeAlertsCount={2}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('w-12');
    expect(aside).not.toHaveClass('w-16');

    // Button should be centered and have no side text
    const buttons = screen.getAllByRole('button');
    const firstTabBtn = buttons[0];
    expect(firstTabBtn).toHaveClass('justify-center');
    expect(screen.queryByText('Ficha & Diagnóstico')).not.toBeInTheDocument();

    // Alert badge should be rendered floating/compact
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders full navigation labels and wider width when expanded', () => {
    const onTabChange = vi.fn();
    const onToggleCollapse = vi.fn();

    const { container } = render(
      <Sidebar
        activeTab="inventory"
        onTabChange={onTabChange}
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
        activeAlertsCount={0}
      />
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('w-52');
    expect(screen.getByText('Ficha & Diagnóstico')).toBeInTheDocument();
    expect(screen.getByText('Alertas Activas')).toBeInTheDocument();
    expect(screen.getByText('Reseteos & Uptime')).toBeInTheDocument();
  });

  it('triggers onTabChange when clicking navigation items', () => {
    const onTabChange = vi.fn();
    render(
      <Sidebar
        activeTab="inventory"
        onTabChange={onTabChange}
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );

    const alertsTab = screen.getByRole('button', { name: /alertas activas/i });
    fireEvent.click(alertsTab);
    expect(onTabChange).toHaveBeenCalledWith('alerts');
  });
});
