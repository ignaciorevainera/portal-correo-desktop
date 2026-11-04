import {
  render,
  screen,
  fireEvent,
  within,
  act,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Topbar } from '../components/Topbar';
import { ThemeProvider } from '../context/ThemeContext';

const RECENT_KEY = 'pcd_recent_searches';

// Radix registra el listener de `pointerdown` en un setTimeout(0) tras abrir;
// sin dejarlo correr, el evento fuera del popover no llega a Radix.
const flushPointerDownListener = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

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

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
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

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);

    // Arrow up wraps around to last item (PC-B)
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onSelectTerminal).toHaveBeenCalledWith('PC-B');
  });

  it('expone el historial como listbox con opción activa y aria-selected', async () => {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(['SUC10-PC01', 'SUC10-PC02', 'SUC20-PC03']),
    );

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} onSelectAccount={vi.fn()} />
      </ThemeProvider>,
    );

    const input = screen.getByRole('combobox', { name: /buscar terminal/i });
    act(() => {
      input.focus();
    });
    fireEvent.change(input, { target: { value: '' } });

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(listbox).toHaveAttribute('id', 'terminal-search-list');
    // El popover no roba el foco: se sigue escribiendo en el input del topbar.
    expect(input).toHaveFocus();

    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const active = within(listbox).getAllByRole('option')[0];
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(active).toHaveAttribute('data-selected', 'true');
  });

  it('recorre el historial con ArrowDown y vuelve al primero al llegar al final', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);

    // Sin opción activa: la primera flecha marca el primer ítem.
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      screen.getByRole('option', { name: /PC-A/i }),
    ).toHaveAttribute('aria-selected', 'true');

    // Segunda flecha: segundo ítem; tercera: vuelve al primero (wrap).
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      screen.getByRole('option', { name: /PC-B/i }),
    ).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      screen.getByRole('option', { name: /PC-A/i }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter sin opción activa envía la consulta cruda', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'PC' } });

    // Hay coincidencias en el historial, pero ninguna está activa.
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(onSelectTerminal).toHaveBeenCalledWith('PC');
    expect(onSelectTerminal).not.toHaveBeenCalledWith('PC-A');
  });

  it('selecciona una opción del historial al hacer click en la fila', () => {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(['SUC10-PC01', 'SUC10-PC02']),
    );

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);

    fireEvent.click(screen.getByRole('option', { name: /SUC10-PC02/i }));

    expect(onSelectTerminal).toHaveBeenCalledWith('SUC10-PC02');
  });

  it('mantiene las acciones de VNC y de quitar del historial fuera de la opción', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['SUC10-PC01']));

    const onSelectTerminal = vi.fn();
    const onDirectVnc = vi.fn();
    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={onSelectTerminal}
          onDirectVnc={onDirectVnc}
        />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);

    // Las acciones son hermanas de la opción, no hijas: un option no puede
    // contener controles interactivos.
    const option = screen.getByRole('option', { name: /SUC10-PC01/i });
    const vncButton = screen.getByRole('button', {
      name: 'Conectar VNC a SUC10-PC01',
    });
    expect(option).not.toContainElement(vncButton);

    fireEvent.click(vncButton);
    expect(onDirectVnc).toHaveBeenCalledWith('SUC10-PC01');
    // La acción de VNC también selecciona el terminal y limpia la consulta.
    expect(onSelectTerminal).toHaveBeenCalledWith('SUC10-PC01');
    expect(searchInput).toHaveValue('');

    fireEvent.focus(searchInput);
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar SUC10-PC01 del historial' }),
    );
    expect(
      screen.queryByRole('option', { name: /SUC10-PC01/i }),
    ).not.toBeInTheDocument();
  });

  it('conserva Ctrl+F para enfocar el buscador y Escape para cerrar', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['SUC10-PC01']));

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Ctrl+F devuelve el foco al buscador desde otro control.
    act(() => {
      screen.getByRole('button', { name: /portal mda/i }).focus();
    });
    fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    expect(searchInput).toHaveFocus();
  });

  it('descarta la opción activa al reabrir con click después de Escape', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'PC' } });
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      screen.getByRole('option', { name: /PC-A/i }),
    ).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // El click reabre aunque el foco siga en el input, sin fila activa.
    fireEvent.click(searchInput);
    const listbox = screen.getByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .some((option) => option.getAttribute('aria-selected') === 'true'),
    ).toBe(false);

    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectTerminal).toHaveBeenCalledWith('PC');
    expect(onSelectTerminal).not.toHaveBeenCalledWith('PC-A');
  });

  it('reabre el historial y activa la primera opción con ArrowDown estando cerrado', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /PC-A/i }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('no activa una fila al filtrar y Enter envía la consulta cruda', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(
      screen.getByRole('option', { name: /PC-A/i }),
    ).toHaveAttribute('aria-selected', 'true');

    // Al angostar la consulta el ítem activo se desmonta y cmdk no debe
    // autoseleccionar la primera coincidencia restante.
    fireEvent.change(searchInput, { target: { value: 'B' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute('aria-selected', 'false');

    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectTerminal).toHaveBeenCalledWith('B');
    expect(onSelectTerminal).not.toHaveBeenCalledWith('PC-B');
  });

  it('expone la opción activa mediante aria-activedescendant', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    const active = screen.getByRole('option', { name: /PC-A/i });
    expect(active).toHaveAttribute('id', 'terminal-search-option-PC-A');
    expect(searchInput).toHaveAttribute(
      'aria-activedescendant',
      active.id,
    );
    expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
    expect(screen.getByRole('listbox')).toHaveAccessibleName(
      'Resultados de búsqueda',
    );
    expect(
      screen.getByRole('dialog', { name: 'Resultados de búsqueda' }),
    ).toBeInTheDocument();
  });

  it('elimina la fila activa con Delete sin enviar la búsqueda', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A', 'PC-B']));

    const onSelectTerminal = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={onSelectTerminal} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    expect(searchInput).toHaveAttribute(
      'aria-keyshortcuts',
      'Delete Control+Enter',
    );
    fireEvent.focus(searchInput);
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    fireEvent.keyDown(searchInput, { key: 'Delete' });

    expect(onSelectTerminal).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('option', { name: /PC-A/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /PC-B/i }),
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('lanza el flujo VNC de la fila activa con Ctrl+Enter', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A']));

    const onSelectTerminal = vi.fn();
    const onDirectVnc = vi.fn();
    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={onSelectTerminal}
          onDirectVnc={onDirectVnc}
        />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    fireEvent.keyDown(searchInput, { key: 'Enter', ctrlKey: true });

    expect(onDirectVnc).toHaveBeenCalledWith('PC-A');
    expect(onSelectTerminal).toHaveBeenCalledWith('PC-A');
    expect(searchInput).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filtra el historial mientras se escribe', () => {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(['PC-A', 'PC-B', 'SUC-10']),
    );

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    expect(screen.getAllByRole('option')).toHaveLength(3);

    fireEvent.change(searchInput, { target: { value: 'PC' } });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(
      screen.getByRole('option', { name: /PC-A/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /SUC-10/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra el estado vacío cuando el historial no coincide', () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A']));

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    fireEvent.change(searchInput, { target: { value: 'ZZZ' } });

    expect(
      screen.getByText('Sin coincidencias en el historial.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('cierra el historial al hacer click fuera', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['PC-A']));

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const searchInput = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(searchInput);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await flushPointerDownListener();

    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('mantiene el listbox abierto al hacer click en el buscador', async () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(['SUC10-PC01']));

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} onSelectAccount={vi.fn()} />
      </ThemeProvider>,
    );

    const input = screen.getByRole('combobox', { name: /buscar terminal/i });
    fireEvent.focus(input);
    await screen.findByRole('listbox');

    const submit = screen.getByRole('button', {
      name: 'Buscar terminal, IP o usuario',
    });

    for (const target of [input, submit]) {
      // Si el popover se remonta, Radix vuelve a registrar el listener con
      // setTimeout(0); hay que dejarlo correr antes de cada secuencia.
      await flushPointerDownListener();
      fireEvent.pointerDown(target);
      fireEvent.mouseDown(target);
      fireEvent.mouseUp(target);
      fireEvent.click(target);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    }
  });
});
