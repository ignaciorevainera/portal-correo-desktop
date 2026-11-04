import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { OperatorContextMenu } from "../components/OperatorContextMenu";
import { getAllTerminals } from "../services/terminalService";

describe("OperatorContextMenu", () => {
  it("se abre como menu con las acciones del operador", async () => {
    const terminal = getAllTerminals()[0];
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={vi.fn()}
          onQueryAccount={vi.fn()}
        />
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("menu-surface"));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByText(/acciones ·/i)).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /conectar vnc viewer/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /copiar ip/i }),
    ).toBeInTheDocument();
  });

  it("ejecuta la acción y cierra el menú", async () => {
    const onLaunchVnc = vi.fn();
    const terminal = getAllTerminals()[0];
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={onLaunchVnc}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={vi.fn()}
        />
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /conectar vnc viewer/i }),
    );

    expect(onLaunchVnc).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("sin terminal ofrece sólo el Portal MDA", async () => {
    const onOpenPortalMda = vi.fn();
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={null}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={onOpenPortalMda}
        />
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("menu-surface"));

    const items = await screen.findAllByRole("menuitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAccessibleName(/abrir portal mda/i);

    fireEvent.click(items[0]);
    expect(onOpenPortalMda).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ejecuta MSRA, ping y portal desde el menú", async () => {
    const onLaunchMsra = vi.fn();
    const onTogglePing = vi.fn();
    const onOpenPortalMda = vi.fn();
    const terminal = getAllTerminals()[0];
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onTogglePing={onTogglePing}
          onLaunchMsra={onLaunchMsra}
          onOpenPortalMda={onOpenPortalMda}
        />
      </ContextMenu>,
    );

    const openMenu = () =>
      fireEvent.contextMenu(screen.getByTestId("menu-surface"));

    openMenu();
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /asistencia msra/i }),
    );
    expect(onLaunchMsra).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();

    openMenu();
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /iniciar ping/i }),
    );
    expect(onTogglePing).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();

    openMenu();
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /abrir portal mda/i }),
    );
    expect(onOpenPortalMda).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("se cierra con Escape", async () => {
    const terminal = getAllTerminals()[0];
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={vi.fn()}
        />
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    await screen.findByRole("menu");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("copia IP y hostname al portapapeles", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
    const terminal = getAllTerminals()[0];
    const renderMenu = () =>
      render(
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <main data-testid="menu-surface">contenido</main>
          </ContextMenuTrigger>
          <OperatorContextMenu
            terminal={terminal}
            isPinging={false}
            onLaunchVnc={vi.fn()}
            onTogglePing={vi.fn()}
            onLaunchMsra={vi.fn()}
            onOpenPortalMda={vi.fn()}
          />
        </ContextMenu>,
      );

    const first = renderMenu();
    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /copiar ip/i }),
    );
    expect(writeTextMock).toHaveBeenCalledWith(terminal.ip);

    first.unmount();
    renderMenu();
    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /copiar hostname/i }),
    );
    expect(writeTextMock).toHaveBeenCalledWith(terminal.pc);
  });

  it("muestra la acción de cuenta sólo con usuarios NT válidos", async () => {
    const terminal = getAllTerminals()[0];
    const onQueryAccount = vi.fn();
    const renderMenu = (userNt: string) => (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={{ ...terminal, userNt }}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={vi.fn()}
          onQueryAccount={onQueryAccount}
        />
      </ContextMenu>
    );

    const valid = render(renderMenu("jperez"));
    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /ver cuenta ad/i }),
    );
    expect(onQueryAccount).toHaveBeenCalledTimes(1);
    valid.unmount();

    render(renderMenu("operador.demo01"));
    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /ver cuenta ad/i }),
    ).not.toBeInTheDocument();
  });

  it("expone un nombre accesible y navega con flechas", async () => {
    const terminal = getAllTerminals()[0];
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={vi.fn()}
          onQueryAccount={vi.fn()}
        />
      </ContextMenu>,
    );

    fireEvent.keyDown(screen.getByTestId("menu-surface"), {
      key: "F10",
      shiftKey: true,
    });
    fireEvent.contextMenu(screen.getByTestId("menu-surface"));

    const menu = await screen.findByRole("menu", {
      name: /acciones del operador/i,
    });
    expect(menu).toBeInTheDocument();

    // Radix enfoca el primer ítem al abrir con teclado; la flecha baja mueve
    // el foco al segundo. Con apertura por mouse el foco queda en el menú,
    // por eso la apertura se simula con Shift+F10.
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    // RovingFocusGroup difiere el foco con `setTimeout`.
    await waitFor(() => expect(items[1]).toHaveFocus());
  });
});
