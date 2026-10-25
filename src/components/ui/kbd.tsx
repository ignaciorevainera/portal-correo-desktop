import * as React from "react"
import { cn } from "cn"

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center justify-center rounded border border-border bg-muted/80 px-1 py-0.2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground shadow-2xs select-none",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
