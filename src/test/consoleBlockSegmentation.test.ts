import { describe, it, expect } from "vitest";
import {
  groupConsoleLinesIntoBlocks,
  isCommandLine,
  extractBlockText,
  ConsoleBlock,
} from "@/lib/consoleBlocks";
import { ConsoleLine } from "@/components/LivePingConsole";

describe("consoleBlocks segmentation engine", () => {
  it("identifies command lines accurately", () => {
    expect(isCommandLine("[12:30:00] > ping 192.168.1.1")).toBe(true);
    expect(isCommandLine("[12:30:00] > [ROUTER .250] ping -t 192.168.1.250")).toBe(true);
    expect(isCommandLine("[12:30:00] > tracert -d 10.0.0.1")).toBe(true);
    expect(isCommandLine("[12:30:00] > nbtstat -A 10.0.0.1")).toBe(true);
    expect(isCommandLine("[12:30:00] > net user juan.perez /domain")).toBe(true);

    expect(isCommandLine("Respuesta desde 192.168.1.1: bytes=32 tiempo=1ms TTL=64")).toBe(false);
    expect(isCommandLine("[12:30:05] Proceso ping finalizado (código: 0).")).toBe(false);
    expect(isCommandLine("")).toBe(false);
  });

  it("returns empty array when lines array is empty", () => {
    const blocks = groupConsoleLinesIntoBlocks([]);
    expect(blocks).toEqual([]);
  });

  it("groups a single command and its output into one block", () => {
    const lines: ConsoleLine[] = [
      { id: 1, text: "[10:00:00] > ping 192.168.0.50", tone: "text-console-info font-bold" },
      { id: 2, text: "Respuesta desde 192.168.0.50: bytes=32 tiempo=2ms TTL=128", tone: "text-console-fg" },
      { id: 3, text: "Respuesta desde 192.168.0.50: bytes=32 tiempo=1ms TTL=128", tone: "text-console-fg" },
      { id: 4, text: "[10:00:02] Proceso ping finalizado (código: 0).", tone: "text-console-success font-semibold" },
    ];

    const blocks = groupConsoleLinesIntoBlocks(lines);

    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.id).toBe("block-1");
    expect(block.commandText).toBe("[10:00:00] > ping 192.168.0.50");
    expect(block.lines).toHaveLength(4);
    expect(extractBlockText(block)).toBe(
      "[10:00:00] > ping 192.168.0.50\n" +
      "Respuesta desde 192.168.0.50: bytes=32 tiempo=2ms TTL=128\n" +
      "Respuesta desde 192.168.0.50: bytes=32 tiempo=1ms TTL=128\n" +
      "[10:00:02] Proceso ping finalizado (código: 0)."
    );
  });

  it("segments multiple consecutive commands into distinct independent blocks", () => {
    const lines: ConsoleLine[] = [
      // Bloque 1: Ping router
      { id: 1, text: "[10:00:00] > [ROUTER .250] ping -n 4 192.168.0.250", tone: "text-console-info font-bold" },
      { id: 2, text: "Respuesta desde 192.168.0.250: bytes=32 tiempo=1ms", tone: "text-console-fg" },
      { id: 3, text: "[10:00:01] Proceso ping finalizado (código: 0).", tone: "text-console-success font-semibold" },

      // Bloque 2: Tracert
      { id: 4, text: "[10:00:05] > tracert -d 192.168.0.250", tone: "text-console-info font-bold" },
      { id: 5, text: "  1    <1 ms    <1 ms    <1 ms  192.168.0.250", tone: "text-console-fg" },
      { id: 6, text: "[10:00:07] Proceso tracert finalizado (código: 0).", tone: "text-console-success font-semibold" },
    ];

    const blocks = groupConsoleLinesIntoBlocks(lines);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe("block-1");
    expect(blocks[0].commandText).toBe("[10:00:00] > [ROUTER .250] ping -n 4 192.168.0.250");
    expect(blocks[0].lines).toHaveLength(3);

    expect(blocks[1].id).toBe("block-4");
    expect(blocks[1].commandText).toBe("[10:00:05] > tracert -d 192.168.0.250");
    expect(blocks[1].lines).toHaveLength(3);
  });

  it("handles orphaned lines before any command header (e.g. initial banner or truncated buffer)", () => {
    const lines: ConsoleLine[] = [
      { id: 10, text: "Línea residual de salida previa...", tone: "text-console-fg" },
      { id: 11, text: "Segunda línea sin cabecera...", tone: "text-console-fg" },
      { id: 12, text: "[10:05:00] > ping 192.168.1.1", tone: "text-console-info font-bold" },
      { id: 13, text: "Respuesta desde 192.168.1.1: bytes=32", tone: "text-console-fg" },
    ];

    const blocks = groupConsoleLinesIntoBlocks(lines);

    expect(blocks).toHaveLength(2);
    // Bloque huérfano inicial
    expect(blocks[0].id).toBe("block-10");
    expect(blocks[0].commandText).toBeUndefined();
    expect(blocks[0].lines).toHaveLength(2);
    expect(extractBlockText(blocks[0])).toBe(
      "Línea residual de salida previa...\nSegunda línea sin cabecera..."
    );

    // Segundo bloque legítimo
    expect(blocks[1].id).toBe("block-12");
    expect(blocks[1].commandText).toBe("[10:05:00] > ping 192.168.1.1");
    expect(blocks[1].lines).toHaveLength(2);
  });

  it("maintains stable block IDs as new lines stream into the current command", () => {
    const initialLines: ConsoleLine[] = [
      { id: 100, text: "[11:00:00] > ping -t 192.168.1.1", tone: "text-console-info font-bold" },
      { id: 101, text: "Respuesta 1...", tone: "text-console-fg" },
    ];

    const firstRunBlocks = groupConsoleLinesIntoBlocks(initialLines);
    expect(firstRunBlocks).toHaveLength(1);
    expect(firstRunBlocks[0].id).toBe("block-100");

    // Llega una nueva línea de ping en vivo
    const updatedLines: ConsoleLine[] = [
      ...initialLines,
      { id: 102, text: "Respuesta 2...", tone: "text-console-fg" },
    ];

    const secondRunBlocks = groupConsoleLinesIntoBlocks(updatedLines);
    expect(secondRunBlocks).toHaveLength(1);
    expect(secondRunBlocks[0].id).toBe("block-100"); // Estable!
    expect(secondRunBlocks[0].lines).toHaveLength(3);
  });
});
