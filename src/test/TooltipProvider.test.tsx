import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

describe("TooltipProvider", () => {
  it("permite renderizar un Tooltip completo", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Copiar</TooltipTrigger>
          <TooltipContent>Copiar IP</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("Copiar")).toBeInTheDocument();
  });

  it("main.tsx envuelve App con TooltipProvider", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/main.tsx"),
      "utf-8",
    );
    expect(source).toMatch(/TooltipProvider[\s\S]*<App \/>/);
  });
});
