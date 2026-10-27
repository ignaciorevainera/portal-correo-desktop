import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the key as copied and clears it after the reset window", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("ip", "192.0.2.101");
    });
    expect(result.current.copiedKey).toBe("ip");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copiedKey).toBeNull();
  });

  it("ignores empty values", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    let copied = true;

    await act(async () => {
      copied = await result.current.copy("ip", "   ");
    });

    expect(copied).toBe(false);
    expect(result.current.copiedKey).toBeNull();
  });
});
