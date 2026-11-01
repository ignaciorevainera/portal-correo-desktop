import { describe, it, expect } from "vitest";
import { deriveSiteTargets } from "./siteTargets";

describe("deriveSiteTargets", () => {
  it("derives router (.250) and server (.231) correctly for a valid IPv4 address", () => {
    const result = deriveSiteTargets("10.66.10.1");
    expect(result).toEqual({
      routerIp: "10.66.10.250",
      serverIp: "10.66.10.231",
      isTargetRouter: false,
      isValid: true,
    });
  });

  it("identifies when the target IP is already the router (.250)", () => {
    const result = deriveSiteTargets("10.66.10.250");
    expect(result).toEqual({
      routerIp: "10.66.10.250",
      serverIp: "10.66.10.231",
      isTargetRouter: true,
      isValid: true,
    });
  });

  it("handles whitespace in IP string", () => {
    const result = deriveSiteTargets("  192.168.1.45  ");
    expect(result).toEqual({
      routerIp: "192.168.1.250",
      serverIp: "192.168.1.231",
      isTargetRouter: false,
      isValid: true,
    });
  });

  it("returns null or invalid structure for non-IPv4 addresses or invalid input", () => {
    expect(deriveSiteTargets("")).toEqual({
      routerIp: null,
      serverIp: null,
      isTargetRouter: false,
      isValid: false,
    });
    expect(deriveSiteTargets("hostname-only")).toEqual({
      routerIp: null,
      serverIp: null,
      isTargetRouter: false,
      isValid: false,
    });
    expect(deriveSiteTargets("999.999.999.999")).toEqual({
      routerIp: null,
      serverIp: null,
      isTargetRouter: false,
      isValid: false,
    });
    expect(deriveSiteTargets("10.66.10")).toEqual({
      routerIp: null,
      serverIp: null,
      isTargetRouter: false,
      isValid: false,
    });
  });
});
