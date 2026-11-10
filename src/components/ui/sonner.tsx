import React from "react"
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "../../context/ThemeContext"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  let theme: ToasterProps["theme"] = "system"
  try {
    const themeContext = useTheme()
    if (themeContext?.theme) {
      theme = themeContext.theme as ToasterProps["theme"]
    }
  } catch {
    // fallback seguro cuando se renderiza fuera de ThemeProvider
  }

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group font-sans max-w-[calc(100vw-1.5rem)]"
      richColors
      position="bottom-right"
      offset={12}
      gap={6}
      style={
        {
          "--width": "min(340px, calc(100vw - 1.5rem))",
        } as React.CSSProperties
      }
      icons={{
        success: <CircleCheck className="h-3.5 w-3.5 text-success shrink-0" />,
        info: <Info className="h-3.5 w-3.5 text-info shrink-0" />,
        warning: <TriangleAlert className="h-3.5 w-3.5 text-warning shrink-0" />,
        error: <OctagonX className="h-3.5 w-3.5 text-destructive shrink-0" />,
        loading: <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md font-sans text-xs max-w-[calc(100vw-1.5rem)] p-2.5 rounded-lg border",
          title: "text-xs font-medium",
          description: "group-[.toast]:text-muted-foreground text-2xs leading-relaxed",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-2xs font-semibold px-2 py-1 h-auto rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-2xs px-2 py-1 h-auto rounded-md",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
