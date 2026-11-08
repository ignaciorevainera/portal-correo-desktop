import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-5 text-foreground sm:p-6">
          <section className="flex w-full max-w-lg flex-col gap-5 rounded-lg border border-destructive/40 bg-card p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h1 className="text-lg font-bold font-heading text-balance">
                La aplicación encontró un problema
              </h1>
            </div>

            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              Algo falló mientras se mostraba esta pantalla. Podés volver a
              intentar o recargar la ventana. Si el problema se repite, contactá
              a soporte técnico.
            </p>

            <div className="space-y-2 rounded-md border border-border/70 bg-muted/30 p-4 text-left">
              <h2 className="text-xs font-semibold text-foreground">
                Qué podés hacer
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-pretty text-muted-foreground">
                <li>Elegí Reintentar para volver a cargar la pantalla.</li>
                <li>Si no responde, elegí Recargar app.</li>
                <li>
                  Si el problema persiste, reiniciá la aplicación y avisá a
                  soporte técnico.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReset}
                className="text-xs cursor-pointer"
              >
                Reintentar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar app
              </Button>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
