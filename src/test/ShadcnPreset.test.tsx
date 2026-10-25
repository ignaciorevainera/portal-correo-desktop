import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { HardwareCard } from '@/components/HardwareCard';
import { NetworkAdCard } from '@/components/NetworkAdCard';
import { QuickActionsBar } from '@/components/QuickActionsBar';
import { Topbar } from '@/components/Topbar';
import { ThemeProvider } from '@/context/ThemeContext';
import { getAllTerminals } from '@/services/terminalService';

describe('Shadcn Preset b5XRZYXrNg & UI Primitives', () => {
  it('verifica que components.json está configurado con lucide y aliases correctos', () => {
    const configPath = path.resolve(process.cwd(), 'components.json');
    expect(fs.existsSync(configPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.iconLibrary).toBe('lucide');
    expect(config.aliases.ui).toBe('@/components/ui');
  });

  it('verifica que src/index.css importa las fuentes y estilos del preset b5XRZYXrNg', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('@import "shadcn/tailwind.css";');
    expect(cssContent).toContain('@import "@fontsource-variable/geist";');
    expect(cssContent).toContain('@import "@fontsource-variable/roboto-slab";');
  });

  it('renderiza correctamente las primitivas Button, Card, Badge e Input de shadcn', () => {
    render(
      <Card size="sm">
        <CardHeader>
          <CardTitle>Título de Prueba</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Activo</Badge>
          <Input placeholder="Buscar terminal..." />
          <Button variant="default" size="sm">Acción</Button>
        </CardContent>
      </Card>
    );

    expect(screen.getByText('Título de Prueba')).toHaveAttribute('data-slot', 'card-title');
    expect(screen.getByText('Activo')).toHaveAttribute('data-slot', 'badge');
    expect(screen.getByPlaceholderText('Buscar terminal...')).toHaveAttribute('data-slot', 'input');
    expect(screen.getByRole('button', { name: 'Acción' })).toHaveAttribute('data-slot', 'button');
  });

  it('verifica que los componentes principales (Topbar, QuickActionsBar, HardwareCard, NetworkAdCard) utilizan primitivas shadcn (data-slot)', () => {
    const mockTerminal = getAllTerminals()[0];
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc={mockTerminal.pc} />
        <QuickActionsBar
          terminal={mockTerminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
        <NetworkAdCard terminal={mockTerminal} />
        <HardwareCard terminal={mockTerminal} />
      </ThemeProvider>
    );

    expect(container.querySelectorAll('[data-slot="card"]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('[data-slot="button"]').length).toBeGreaterThanOrEqual(5);
    expect(container.querySelectorAll('[data-slot="badge"]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('[data-slot="input"]').length).toBeGreaterThanOrEqual(1);
  });
});
