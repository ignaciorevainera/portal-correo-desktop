import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const main = fs.readFileSync(path.join(root, "electron/main.cjs"), "utf-8");
const preload = fs.readFileSync(
  path.join(root, "electron/preload.cjs"),
  "utf-8",
);

describe("cierre definitivo por IPC", () => {
  it("registra el canal y marca isQuiting antes de app.quit", () => {
    const handler =
      main.match(/ipcMain\.handle\('pcd:quit-app',[\s\S]*?\n\}\);/)?.[0] ?? "";

    expect(main).toMatch(/ipcMain\.handle\('pcd:quit-app'/);
    expect(handler).not.toBe("");
    expect(handler.indexOf("app.isQuiting = true")).toBeGreaterThan(-1);
    expect(handler.indexOf("app.quit()")).toBeGreaterThan(
      handler.indexOf("app.isQuiting = true"),
    );
  });

  it("expone el canal en el preload", () => {
    expect(preload).toMatch(
      /quitApp:\s*\(\)\s*=>\s*ipcRenderer\.invoke\('pcd:quit-app'\)/,
    );
  });
});
