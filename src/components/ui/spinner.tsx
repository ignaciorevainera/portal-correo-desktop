import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      data-slot="spinner"
      role="status"
      aria-label="Cargando"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
