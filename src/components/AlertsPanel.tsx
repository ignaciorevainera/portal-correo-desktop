import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import { Bell, PlusCircle, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AlertsPanelProps {
  terminal: TerminalData;
  onAddAlert: (alert: { title: string; description: string; operator: string }) => void;
  onCloseAlert: (alertId: string, resolution: string) => void;
}

export function AlertsPanel({
  terminal,
  onAddAlert,
  onCloseAlert,
}: AlertsPanelProps): React.JSX.Element {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [operator, setOperator] = useState('OperadorActual');
  const [closingAlertId, setClosingAlertId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onAddAlert({ title: title.trim(), description: description.trim(), operator });
    setTitle('');
    setDescription('');
    setShowAddForm(false);
  };

  const handleConfirmClose = (alertId: string): void => {
    if (!resolutionText.trim()) return;
    onCloseAlert(alertId, resolutionText.trim());
    setClosingAlertId(null);
    setResolutionText('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Alertas de Terminal ({terminal.pc})
          </h2>
          <p className="text-xs text-muted-foreground">
            Registro y seguimiento de incidencias de hardware, software o cuentas.
          </p>
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="text-xs font-semibold cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          {showAddForm ? 'Cancelar' : 'Nueva Alerta'}
        </Button>
      </div>

      {showAddForm && (
        <Card size="sm" className="p-4 rounded-lg border border-border bg-card shadow-xs animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Registrar Nueva Alerta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Título de la Alerta</label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la alerta..."
                  className="h-8 text-xs bg-muted/60"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Operador Responsable</label>
                <Input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="h-8 text-xs bg-muted/60 font-mono"
                  required
                />
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <label className="text-muted-foreground font-medium">Descripción Detallada</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción detallada de la incidencia..."
                rows={3}
                className="w-full p-2.5 rounded-md bg-muted/60 border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowAddForm(false)}
                className="text-muted-foreground cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                size="xs"
                className="font-semibold cursor-pointer"
              >
                Registrar Alerta
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2.5">
        {terminal.alerts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/40 text-muted-foreground text-xs">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            No hay alertas activas ni pendientes para este equipo.
          </div>
        ) : (
          terminal.alerts.map((alert) => (
            <Card
              key={alert.id}
              size="sm"
              className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all gap-0 py-3.5 ${
                alert.active
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-card border-border opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {alert.active ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                  <h4 className="font-semibold text-foreground text-sm">{alert.title}</h4>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase h-5 ${
                      alert.active
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {alert.active ? 'Activa' : 'Cerrada'}
                  </Badge>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{alert.date}</span>
              </div>

              <p className="text-foreground/90 pl-6 leading-relaxed">{alert.description}</p>

              <div className="flex items-center justify-between pl-6 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="flex items-center gap-1 font-mono">
                  <User className="h-3 w-3" /> Operador: {alert.operator}
                </span>

                {alert.active && closingAlertId !== alert.id && (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => setClosingAlertId(alert.id)}
                    className="text-primary font-medium h-auto p-0 cursor-pointer"
                  >
                    Cerrar Alerta
                  </Button>
                )}
              </div>

              {closingAlertId === alert.id && (
                <div className="mt-2 pl-6 pt-2 border-t border-border space-y-2">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Texto de Cierre / Resolución
                  </label>
                  <Input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe cómo se resolvió la alerta..."
                    className="h-8 text-xs bg-muted/60"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setClosingAlertId(null)}
                      className="text-muted-foreground cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="xs"
                      onClick={() => handleConfirmClose(alert.id)}
                      className="bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      Confirmar Cierre
                    </Button>
                  </div>
                </div>
              )}

              {!alert.active && alert.resolutionText && (
                <div className="ml-6 p-2 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-0.5">
                  <span className="font-semibold text-emerald-500">Resolución:</span>
                  <p>{alert.resolutionText}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
