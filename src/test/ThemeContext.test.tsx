import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

function Probe(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.className = "";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aplica theme-transition durante el cambio y lo retira despues", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("dark");

    act(() => {
      button.click();
    });

    expect(document.documentElement.classList.contains("theme-transition")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.documentElement.classList.contains("theme-transition")).toBe(false);
  });
});
