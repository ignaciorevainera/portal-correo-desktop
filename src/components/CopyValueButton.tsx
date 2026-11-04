import React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

interface CopyValueButtonProps {
  value: string;
  label: string;
  className?: string;
}

export function CopyValueButton({
  value,
  label,
  className,
}: CopyValueButtonProps): React.JSX.Element {
  const { copiedKey, copy } = useCopyToClipboard();
  const copied = copiedKey === "value";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={() => {
        void copy("value", value);
      }}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="text-success" />
      ) : (
        <Copy />
      )}
    </Button>
  );
}
