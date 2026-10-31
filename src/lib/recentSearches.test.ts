import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadRecentSearches,
  RECENT_SEARCHES_KEY,
  removeRecentSearch,
  saveRecentSearch,
  subscribeToRecentSearches,
  updateRecentSearchKind,
} from "./recentSearches";

describe("recentSearches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates legacy string entries using the classifier", () => {
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(["jperez", "WS-DEMO-002", "PC-DEMO-001"]),
    );

    expect(loadRecentSearches()).toEqual([
      { value: "jperez", kind: "account" },
      { value: "WS-DEMO-002", kind: "terminal" },
      { value: "PC-DEMO-001", kind: "terminal" },
    ]);
  });

  it("dedupes case-insensitively and keeps at most five", () => {
    saveRecentSearch("jperez", "account");
    saveRecentSearch("JPERez", "account");
    expect(loadRecentSearches()).toEqual([
      { value: "JPERez", kind: "account" },
    ]);

    saveRecentSearch("a", "terminal");
    saveRecentSearch("b", "terminal");
    saveRecentSearch("c", "terminal");
    saveRecentSearch("d", "terminal");
    saveRecentSearch("e", "terminal");

    const items = loadRecentSearches();
    expect(items).toHaveLength(5);
    expect(items[0]).toEqual({ value: "e", kind: "terminal" });
  });

  it("updates the kind of an existing entry", () => {
    saveRecentSearch("juan", "terminal");
    updateRecentSearchKind("JUAN", "account");

    expect(loadRecentSearches()).toEqual([{ value: "juan", kind: "account" }]);
  });

  it("removes entries and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToRecentSearches(listener);

    saveRecentSearch("jperez", "account");
    expect(listener).toHaveBeenCalledTimes(1);

    removeRecentSearch("jperez");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(loadRecentSearches()).toEqual([]);

    unsubscribe();
    saveRecentSearch("mgomez", "account");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores invalid stored JSON", () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, "{not-json");
    expect(loadRecentSearches()).toEqual([]);
  });
});
