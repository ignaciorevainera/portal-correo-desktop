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
