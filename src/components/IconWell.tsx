import React from "react";
import { cn } from "@/lib/utils";

interface IconWellProps {
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}

/**
 * Cuadrado teñido para el icono de una sección.
 * Un solo tinte y un solo radio por tamaño en toda la aplicación.
 */
export function IconWell({
  size = "md",
  className,
  children,
  ...props
}: IconWellProps & React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "shrink-0 bg-primary/10 text-link",
        size === "sm" ? "rounded-md p-1" : "rounded-lg p-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
