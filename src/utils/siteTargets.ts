/**
 * Utility to derive site network targets (Router .250 and Server .231)
 * from a target terminal's IPv4 address.
 */

export interface SiteTargets {
  routerIp: string | null;
  serverIp: string | null;
  isTargetRouter: boolean;
  isValid: boolean;
}

const IPV4_REGEX =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export function deriveSiteTargets(rawIp?: string | null): SiteTargets {
  if (!rawIp || typeof rawIp !== "string") {
    return {
      routerIp: null,
      serverIp: null,
      isTargetRouter: false,
      isValid: false,
    };
  }

  const trimmed = rawIp.trim();
  const match = trimmed.match(IPV4_REGEX);

  if (!match) {
    return {
      routerIp: null,
      serverIp: null,
      isTargetRouter: false,
      isValid: false,
    };
  }

  const [_, o1, o2, o3, o4] = match;
  const prefix = `${o1}.${o2}.${o3}`;
  const isTargetRouter = o4 === "250";

  return {
    routerIp: `${prefix}.250`,
    serverIp: `${prefix}.231`,
    isTargetRouter,
    isValid: true,
  };
}
