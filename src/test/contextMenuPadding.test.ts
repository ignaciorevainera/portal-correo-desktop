import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/ui/context-menu.tsx"),
  "utf-8",
);

describe("ContextMenuContent viewport gutter", () => {
  it("reserva un margen de 8 px contra los bordes del viewport", () => {
    expect(source).toMatch(/collisionPadding\s*=\s*8/);
    expect(source).toMatch(/collisionPadding=\{collisionPadding\}/);
  });
});
