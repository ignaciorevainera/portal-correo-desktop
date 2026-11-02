import { describe, expect, it } from "vitest";
import {
  classifySearch,
  isIpAddress,
  isValidUsername,
  splitUsernames,
} from "./usernames";

describe("usernames", () => {
  it("accepts only alphanumeric usernames up to 64 chars", () => {
    expect(isValidUsername("jperez")).toBe(true);
    expect(isValidUsername("OPERADOR01")).toBe(true);
    expect(isValidUsername("a".repeat(64))).toBe(true);
    expect(isValidUsername("a".repeat(65))).toBe(false);
    expect(isValidUsername("operador.demo01")).toBe(false);
    expect(isValidUsername("juan-perez")).toBe(false);
    expect(isValidUsername("CORREO\\jperez")).toBe(false);
    expect(isValidUsername("   ")).toBe(false);
    expect(isValidUsername(null)).toBe(false);
  });

  it("splits the NT field and drops invalid entries", () => {
    expect(
      splitUsernames("jperez | mgomez | operador.demo01 | "),
    ).toEqual(["jperez", "mgomez"]);
    expect(splitUsernames("")).toEqual([]);
    expect(splitUsernames(undefined)).toEqual([]);
  });

  it("detects IPv4 addresses", () => {
    expect(isIpAddress("192.0.2.101")).toBe(true);
    expect(isIpAddress("jperez")).toBe(false);
    expect(isIpAddress("192.0.2")).toBe(false);
  });

  it("classifies account-like and terminal-like searches", () => {
    expect(classifySearch("jperez")).toBe("account");
    expect(classifySearch("mgomez")).toBe("account");
    expect(classifySearch("operadordemo01")).toBe("account");
    expect(classifySearch("  jperez  ")).toBe("account");

    expect(classifySearch("PC-DEMO-001")).toBe("terminal");
    expect(classifySearch("WS-CORP-100")).toBe("terminal");
    expect(classifySearch("192.0.2.101")).toBe("terminal");
    expect(classifySearch("PCDEMO01")).toBe("terminal");
    expect(classifySearch("TERM01")).toBe("terminal");
    expect(classifySearch("juan")).toBe("terminal");
    expect(classifySearch("")).toBe("terminal");
    expect(classifySearch(null)).toBe("terminal");
  });
});
