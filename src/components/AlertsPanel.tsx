import React, { useState } from 'react';
import { TerminalData, TerminalAlert } from '../types/terminal';
import { PlusCircle, AlertCircle, CheckCircle, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
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

  const toggleExpand = (id: string) => {
    setExpandedAlertId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {/* Section Header sin icono */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div>
          <h2 className="text-base font-semibold font-heading text-foreground">
            Alertas de Terminal ({terminal.pc})
          </h2>
          <p className="text-xs text-muted-foreground">
            Historial de incidencias técnicas, observaciones operativas y seguimiento.
          </p>
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="text-xs font-semibold cursor-pointer h-8 gap-1.5"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {showAddForm ? 'Cancelar' : 'Nueva Alerta'}
        </Button>
      </div>

      {showAddForm && (
        <Card size="sm" className="rounded-lg border-border bg-card shadow-xs animate-fade-in">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">
              Registrar Nueva Alerta
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="alert-title-input" className="text-muted-foreground font-medium">
                    Título de la Alerta
                  </Label>
                  <Input
                    id="alert-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Título breve del incidente..."
                    className="h-8 text-xs bg-muted/60"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="alert-operator-input" className="text-muted-foreground font-medium">
                    Operador Responsable
                  </Label>
                  <Input
                    id="alert-operator-input"
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="h-8 text-xs bg-muted/60 font-mono"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <Label htmlFor="alert-desc-textarea" className="text-muted-foreground font-medium">
                  Descripción Detallada
                </Label>
                <Textarea
                  id="alert-desc-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre la falla de hardware, software o cuentas..."
                  rows={2}
                  className="bg-muted/60 resize-none text-xs"
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
          </CardContent>
        </Card>
      )}

      {/* Tabla Compacta en Renglones */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {terminal.alerts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-1.5">
            <CheckCircle className="h-6 w-6 text-emerald-500 opacity-80" />
            <span>No hay alertas registradas para este equipo.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                  <th className="py-2 px-3 w-28">Estado</th>
                  <th className="py-2 px-3">Título / Detalle</th>
                  <th className="py-2 px-3 w-36">Operador</th>
                  <th className="py-2 px-3 w-36">Fecha</th>
                  <th className="py-2 px-3 w-24 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {terminal.alerts.map((alert) => (
                  <React.Fragment key={alert.id}>
                    <tr
                      onClick={() => toggleExpand(alert.id)}
                      className={`hover:bg-muted/40 transition-colors cursor-pointer ${
                        alert.active ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase h-5 inline-flex items-center gap-1 ${
                            alert.active
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              alert.active ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {alert.active ? 'Activa' : 'Cerrada'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <span>{alert.title}</span>
                          {alert.description && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-xs font-normal">
                              — {alert.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 opacity-60" />
                          <span>{alert.operator}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono whitespace-nowrap text-[11px]">
                        {alert.date}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {alert.active && closingAlertId !== alert.id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setClosingAlertId(alert.id);
                              setExpandedAlertId(alert.id);
                            }}
                            className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary cursor-pointer"
                          >
                            Cerrar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => toggleExpand(alert.id)}
                            className="h-6 w-6 p-0 text-muted-foreground cursor-pointer"
                          >
                            {expandedAlertId === alert.id ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* Fila expandible con detalle completo o formulario de cierre */}
                    {expandedAlertId === alert.id && (
                      <tr className="bg-muted/20 border-b border-border">
                        <td colSpan={5} className="p-3 text-xs space-y-2">
                          <div className="space-y-1">
                            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                              Descripción:
                            </span>
                            <p className="text-foreground/90 pl-1 leading-relaxed">
                              {alert.description}
                            </p>
                          </div>

                          {!alert.active && alert.resolutionText && (
                            <div className="p-2 rounded bg-muted/60 border border-border/70 text-[11px] space-y-0.5">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Resolución de Cierre:
                              </span>
                              <p className="text-foreground/90">{alert.resolutionText}</p>
                            </div>
                          )}

                          {alert.active && closingAlertId === alert.id && (
                            <div className="pt-2 border-t border-border space-y-2 max-w-lg">
                              <Label
                                htmlFor={`resolve-input-${alert.id}`}
                                className="text-[11px] font-medium text-muted-foreground"
                              >
                                Resolución / Motivo de Cierre
                              </Label>
                              <Input
                                id={`resolve-input-${alert.id}`}
                                type="text"
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                placeholder="Indica cómo fue resuelta la alerta..."
                                className="h-8 text-xs bg-card"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => setClosingAlertId(null)}
                                  className="cursor-pointer"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="xs"
                                  onClick={() => handleConfirmClose(alert.id)}
                                  className="cursor-pointer"
                                >
                                  Confirmar Cierre
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
