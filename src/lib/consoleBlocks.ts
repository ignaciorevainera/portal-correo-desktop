import type { ConsoleLine } from "@/components/LivePingConsole";

export interface ConsoleBlock {
  id: string;
  commandText?: string;
  lines: ConsoleLine[];
}

/**
 * Determina si una línea representa el inicio de una invocación de comando.
 * Formato estándar de cabecera en LivePingConsole: "[HH:MM:SS] > comando [argumentos]"
 */
export function isCommandLine(text: string): boolean {
  if (!text) return false;
  return text.startsWith("[") && text.includes("> ");
}

/**
 * Agrupa secuencialmente una lista de ConsoleLine en bloques lógicos.
 * - Cada bloque inicia con una línea de comando reconocida por isCommandLine.
 * - Las líneas previas a cualquier comando (huérfanas o remanentes de recorte de buffer)
 *   forman un bloque inicial tolerante a fallos.
 * - Los IDs de bloque son estables basados en el id de su primera línea ('block-{id}').
 */
export function groupConsoleLinesIntoBlocks(lines: ConsoleLine[]): ConsoleBlock[] {
  if (!lines || lines.length === 0) return [];

  const blocks: ConsoleBlock[] = [];
  let currentBlock: ConsoleBlock | null = null;

  for (const line of lines) {
    if (isCommandLine(line.text)) {
      if (currentBlock && currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        id: `block-${line.id}`,
        commandText: line.text,
        lines: [line],
      };
    } else {
      if (!currentBlock) {
        currentBlock = {
          id: `block-${line.id}`,
          commandText: undefined,
          lines: [line],
        };
      } else {
        currentBlock.lines.push(line);
      }
    }
  }

  if (currentBlock && currentBlock.lines.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Extrae el texto plano del bloque delimitado por saltos de línea,
 * listo para ser transferido al portapapeles.
 */
export function extractBlockText(block: ConsoleBlock): string {
  return block.lines.map((l) => l.text).join("\n");
}
