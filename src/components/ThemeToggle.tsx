import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Hint } from './Hint';

export function ThemeToggle(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <Hint label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        aria-label="Cambiar tema de interfaz"
        className="text-muted-foreground hover:text-foreground cursor-pointer px-2"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4 text-warning" />
        ) : (
          <Moon className="h-4 w-4 text-foreground" />
        )}
      </Button>
    </Hint>
  );
}
