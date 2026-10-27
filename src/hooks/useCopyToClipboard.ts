import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_RESET_MS = 2000;

export function useCopyToClipboard(resetMs: number = DEFAULT_RESET_MS) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (key: string, text: string): Promise<boolean> => {
      if (!text || text.trim() === "") return false;

      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => setCopiedKey(null), resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  return { copiedKey, copy };
}
