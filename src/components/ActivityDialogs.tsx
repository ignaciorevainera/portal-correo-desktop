import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_OPERATOR,
  DEFAULT_RESET_REASON,
} from "@/lib/constants";

interface NewAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (alert: {
    title: string;
    description: string;
    operator: string;
  }) => void;
}

export function NewAlertDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewAlertDialogProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [operator, setOperator] = useState(DEFAULT_OPERATOR);
  const valid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    operator.trim().length > 0;

  const resetForm = (): void => {
    setTitle("");
    setDescription("");
    setOperator(DEFAULT_OPERATOR);
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      operator: operator.trim(),
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar nueva alerta</DialogTitle>
          <DialogDescription>
            Queda asociada a la terminal activa y al operador que la registra.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="new-alert-title" className="text-xs">
              Título
            </Label>
            <Input
              id="new-alert-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título breve del incidente"
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-alert-description" className="text-xs">
              Descripción
            </Label>
            <Textarea
              id="new-alert-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalle de la falla o del pedido"
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-alert-operator" className="text-xs">
              Operador
            </Label>
            <Input
              id="new-alert-operator"
              value={operator}
              onChange={(event) => setOperator(event.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={!valid} onClick={submit}>
            Registrar alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RequestResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
}

export function RequestResetDialog({
  open,
  onOpenChange,
  onSubmit,
}: RequestResetDialogProps): React.JSX.Element {
  const [reason, setReason] = useState(DEFAULT_RESET_REASON);
  const valid = reason.trim().length > 0;

  const handleOpenChange = (next: boolean): void => {
    if (!next) setReason(DEFAULT_RESET_REASON);
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!valid) return;
    onSubmit(reason.trim());
    setReason(DEFAULT_RESET_REASON);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedir reset de cuenta AD</DialogTitle>
          <DialogDescription>
            La solicitud se envía a la cola de reseteos de la terminal activa.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="reset-reason" className="text-xs">
              Motivo del reseteo
            </Label>
            <Textarea
              id="reset-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={!valid} onClick={submit}>
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CloseAlertDialogProps {
  open: boolean;
  alertTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolution: string) => void;
}

export function CloseAlertDialog({
  open,
  alertTitle,
  onOpenChange,
  onConfirm,
}: CloseAlertDialogProps): React.JSX.Element {
  const [resolution, setResolution] = useState("");
  const valid = resolution.trim().length > 0;

  const handleOpenChange = (next: boolean): void => {
    if (!next) setResolution("");
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!valid) return;
    onConfirm(resolution.trim());
    setResolution("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar alerta</DialogTitle>
          <DialogDescription>{alertTitle}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="close-alert-resolution" className="text-xs">
              Resolución
            </Label>
            <Textarea
              id="close-alert-resolution"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Cómo se resolvió la alerta"
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={!valid} onClick={submit}>
            Confirmar cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
