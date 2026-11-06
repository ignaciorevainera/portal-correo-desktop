import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function themeActionLabel(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}

export function ThemeActionIcon({
  theme,
}: {
  theme: 'light' | 'dark';
}): React.JSX.Element {
  return theme === 'dark' ? (
    <Sun className="h-4 w-4 text-warning" />
  ) : (
    <Moon className="h-4 w-4 text-foreground" />
  );
}

export function ThemeToggle({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label="Cambiar tema de interfaz"
      title={themeActionLabel(theme)}
      className={cn(
        'text-muted-foreground hover:text-foreground cursor-pointer px-2',
        className,
      )}
    >
      <ThemeActionIcon theme={theme} />
    </Button>
  );
}
