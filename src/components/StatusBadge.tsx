import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "info" | "neutral";

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Badge
      variant="outline"
      className="h-5 gap-1.5 border-border px-1.5 text-xs font-medium text-foreground"
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])}
        aria-hidden="true"
      />
      {children}
    </Badge>
  );
}
