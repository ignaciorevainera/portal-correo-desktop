export const USERNAME_PATTERN = /^[A-Za-z0-9]{1,64}$/;

export function isIpAddress(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim());
}

export function isValidUsername(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return USERNAME_PATTERN.test(value.trim());
}

export function splitUsernames(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const unique = new Set<string>();
  for (const part of raw.split("|")) {
    const candidate = part.trim();
    if (isValidUsername(candidate)) unique.add(candidate);
  }
  return [...unique];
}

export type SearchKind = "terminal" | "account";

const HOST_PREFIX = /^(PC|WS|TERM|SRV|NB|SUC)/i;

export function classifySearch(raw: string | null | undefined): SearchKind {
  if (typeof raw !== "string") return "terminal";
  const value = raw.trim();
  if (!value) return "terminal";
  if (isIpAddress(value)) return "terminal";
  if (/[-._\\/]/.test(value)) return "terminal";
  if (HOST_PREFIX.test(value)) return "terminal";
  if (value.length > 20) return "terminal";
  if (!USERNAME_PATTERN.test(value)) return "terminal";
  if (!/[A-Za-z]{6,}/.test(value)) return "terminal";
  return "account";
}
