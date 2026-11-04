import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-foreground select-none">
          <div className="max-w-md w-full rounded-lg border border-destructive/40 bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold font-heading">
                Ocurrió un error inesperado
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La aplicación encontró un fallo en la interfaz y evitó cerrarse
              abruptamente. Podés recargar la ventana para reanudar el estado.
            </p>
            {this.state.error && (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/80 p-3 font-mono text-micro text-destructive leading-tight border border-border">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="text-xs cursor-pointer"
              >
                Reintentar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={this.handleReload}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Recargar app
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
