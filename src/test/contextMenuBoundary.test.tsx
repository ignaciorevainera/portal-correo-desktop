import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  clampEventToViewport,
} from "@/components/ui/context-menu";
import { OperatorContextMenu } from "@/components/OperatorContextMenu";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { getAllTerminals } from "@/services/terminalService";

describe("clampEventToViewport", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      value: 1000,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 600,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      value: originalInnerWidth,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      configurable: true,
      writable: true,
    });
  });

  it("clamps coordinates at the extreme top-left edges using default gutter of 16px", () => {
    const nativeEvent = { clientX: 0, clientY: 2 } as MouseEvent;
    const event = { clientX: 0, clientY: 2, nativeEvent } as unknown as React.MouseEvent;

    clampEventToViewport(event);

    expect(event.clientX).toBe(16);
    expect(event.clientY).toBe(16);
    expect(nativeEvent.clientX).toBe(16);
    expect(nativeEvent.clientY).toBe(16);
  });

  it("clamps coordinates at the extreme bottom-right edges", () => {
    const nativeEvent = { clientX: 999, clientY: 599 } as MouseEvent;
    const event = { clientX: 999, clientY: 599, nativeEvent } as unknown as React.MouseEvent;

    clampEventToViewport(event);

    // 1000 - 16 = 984, 600 - 16 = 584
    expect(event.clientX).toBe(984);
    expect(event.clientY).toBe(584);
    expect(nativeEvent.clientX).toBe(984);
    expect(nativeEvent.clientY).toBe(584);
  });

  it("does not alter coordinates when safely inside the viewport", () => {
    const nativeEvent = { clientX: 450, clientY: 280 } as MouseEvent;
    const event = { clientX: 450, clientY: 280, nativeEvent } as unknown as React.MouseEvent;

    clampEventToViewport(event);

    expect(event.clientX).toBe(450);
    expect(event.clientY).toBe(280);
    expect(nativeEvent.clientX).toBe(450);
    expect(nativeEvent.clientY).toBe(280);
  });

  it("safely handles tiny viewports without inverted bounds", () => {
    Object.defineProperty(window, "innerWidth", { value: 30, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 30, configurable: true });

    const nativeEvent = { clientX: 29, clientY: 29 } as MouseEvent;
    const event = { clientX: 29, clientY: 29, nativeEvent } as unknown as React.MouseEvent;

    // effective gutter = min(16, floor(30/4)) = 7
    clampEventToViewport(event);

    expect(event.clientX).toBe(23); // 30 - 7
    expect(event.clientY).toBe(23); // 30 - 7
  });
});

describe("ContextMenuTrigger viewport boundary handling", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 768,
      configurable: true,
      writable: true,
    });
  });

  it("intercepts right-clicks near the edge and clamps coordinates before triggering", async () => {
    const handleContextMenu = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger" onContextMenu={handleContextMenu}>
          Trigger Surface
        </ContextMenuTrigger>
        <ContextMenuContent data-testid="content">
          <ContextMenuItem>Action 1</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );

    const trigger = screen.getByTestId("trigger");
    fireEvent.contextMenu(trigger, { clientX: 1023, clientY: 767 });

    expect(handleContextMenu).toHaveBeenCalledTimes(1);
    const interceptedEvent = handleContextMenu.mock.calls[0][0];
    expect(interceptedEvent.clientX).toBe(1024 - 16);
    expect(interceptedEvent.clientY).toBe(768 - 16);

    const content = await screen.findByTestId("content");
    expect(content).toBeInTheDocument();
    expect(content.className).toContain("max-h-[var(--radix-context-menu-content-available-height,calc(100vh-2rem))]");
    expect(content.className).toContain("max-w-[calc(100vw-1.5rem)]");
    expect(content.className).toContain("overflow-y-auto");
  });

  it("intercepts pointerdown events and clamps coordinates", () => {
    const handlePointerDown = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger" onPointerDown={handlePointerDown}>
          Trigger Surface
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Action</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );

    const trigger = screen.getByTestId("trigger");
    fireEvent.pointerDown(trigger, { clientX: 2, clientY: 0 });

    expect(handlePointerDown).toHaveBeenCalledTimes(1);
    const interceptedEvent = handlePointerDown.mock.calls[0][0];
    expect(interceptedEvent.clientX).toBe(16);
    expect(interceptedEvent.clientY).toBe(16);
  });
});

describe("Responsive & Immutable Overlay Elements (ContextMenu & Toaster)", () => {
  it("renders OperatorContextMenu with responsive compact width and viewport containment", async () => {
    const terminal = getAllTerminals()[0];

    render(
      <ContextMenu>
        <ContextMenuTrigger data-testid="trigger">
          Trigger Surface
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
      </ContextMenu>
    );

    const trigger = screen.getByTestId("trigger");
    fireEvent.contextMenu(trigger);

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(menu.className).toContain("w-52");
    expect(menu.className).toContain("max-w-[calc(100vw-1.5rem)]");
    expect(menu.className).toContain("text-xs");
  });

  it("renders Toaster with responsive width style bounded by viewport when toast is triggered", async () => {
    render(
      <ThemeProvider>
        <Toaster />
      </ThemeProvider>
    );

    toast("Notificación de prueba");

    const list = await screen.findByRole("list");
    expect(list).toBeInTheDocument();
    expect(list.className).toContain("max-w-[calc(100vw-1.5rem)]");
  });
});
