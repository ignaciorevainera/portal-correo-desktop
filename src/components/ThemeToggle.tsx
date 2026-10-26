import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="default"
      onClick={toggleTheme}
      aria-label="Cambiar tema de interfaz"
      className="text-muted-foreground hover:text-foreground cursor-pointer px-2"
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
      )}
    </Button>
  );
}
