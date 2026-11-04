import { describe, it, expect } from "vitest";
import { cn as aliasedCn } from "cn";
import { cn } from "@/lib/cn";

describe("cn con la escala del producto", () => {
  it("reemplaza un tamaño de la primitiva por text-micro y conserva el color", () => {
    const merged = aliasedCn("text-xs text-muted-foreground", "text-micro");
    expect(merged).toContain("text-micro");
    expect(merged).toContain("text-muted-foreground");
    expect(merged).not.toContain("text-xs");
  });

  it("no descarta el color de una primitiva sólida al aplicar text-micro", () => {
    const merged = cn("bg-primary text-primary-foreground", "text-micro");
    expect(merged).toContain("text-micro");
    expect(merged).toContain("text-primary-foreground");
  });
});
