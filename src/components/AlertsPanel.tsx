import React, { useState } from 'react';
import { TerminalData, TerminalAlert } from '../types/terminal';
import { Bell, PlusCircle, CheckCircle, AlertTriangle, User } from 'lucide-react';

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

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="h-4 w-4" />
          {showAddForm ? 'Cancelar' : 'Nueva Alerta'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-lg border border-border bg-card space-y-3 shadow-sm animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Registrar Nueva Alerta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Título de la Alerta</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título de la alerta..."
                className="w-full h-8 px-2.5 rounded bg-muted/60 border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium">Operador Responsable</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full h-8 px-2.5 rounded bg-muted/60 border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
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
              className="w-full p-2.5 rounded bg-muted/60 border border-input text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              Registrar Alerta
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {terminal.alerts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/40 text-muted-foreground text-xs">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            No hay alertas activas ni pendientes para este equipo.
          </div>
        ) : (
          terminal.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
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
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      alert.active
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {alert.active ? 'Activa' : 'Cerrada'}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{alert.date}</span>
              </div>

              <p className="text-foreground/90 pl-6 leading-relaxed">{alert.description}</p>

              <div className="flex items-center justify-between pl-6 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                <span className="flex items-center gap-1 font-mono">
                  <User className="h-3 w-3" /> Operador: {alert.operator}
                </span>

                {alert.active && closingAlertId !== alert.id && (
                  <button
                    type="button"
                    onClick={() => setClosingAlertId(alert.id)}
                    className="text-primary hover:underline font-medium"
                  >
                    Cerrar Alerta
                  </button>
                )}
              </div>

              {closingAlertId === alert.id && (
                <div className="mt-2 pl-6 pt-2 border-t border-border space-y-2">
                  <label className="block text-[11px] font-medium text-muted-foreground">
                    Texto de Cierre / Resolución
                  </label>
                  <input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe cómo se resolvió la alerta..."
                    className="w-full h-8 px-2.5 rounded bg-muted/60 border border-input text-foreground text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setClosingAlertId(null)}
                      className="px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmClose(alert.id)}
                      className="px-2 py-1 text-xs bg-emerald-600 text-white rounded font-medium hover:bg-emerald-500"
                    >
                      Confirmar Cierre
                    </button>
                  </div>
                </div>
              )}

              {!alert.active && alert.resolutionText && (
                <div className="ml-6 p-2 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-0.5">
                  <span className="font-semibold text-emerald-500">Resolución:</span>
                  <p>{alert.resolutionText}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
