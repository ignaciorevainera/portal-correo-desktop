import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_OPERATOR,
  DEFAULT_RESET_REASON,
} from "@/lib/constants";

const TITLE_ID = "new-alert-title";
const TITLE_HELP_ID = "new-alert-title-help";
const TITLE_ERROR_ID = "new-alert-title-error";
const DESCRIPTION_ID = "new-alert-description";
const OPERATOR_ID = "new-alert-operator";
const OPERATOR_HELP_ID = "new-alert-operator-help";
const RESET_REASON_ID = "reset-reason";
const CLOSE_RESOLUTION_ID = "close-alert-resolution";

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
    title.trim().length >= 3 &&
    description.trim().length > 0 &&
    operator.trim().length > 0;
  // El título necesita al menos 3 caracteres para servir como encabezado.
  const titleError =
    title.length > 0 && title.trim().length < 3
      ? "El título debe tener al menos 3 caracteres."
      : null;
  const titleDescribedBy = titleError
    ? `${TITLE_HELP_ID} ${TITLE_ERROR_ID}`
    : TITLE_HELP_ID;

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
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FieldGroup className="gap-3">
            <Field className="gap-1.5" data-invalid={Boolean(titleError)}>
              <FieldLabel htmlFor={TITLE_ID}>Título</FieldLabel>
              <Input
                id={TITLE_ID}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleDescribedBy}
                placeholder="Título breve del incidente"
                className="text-sm"
                autoFocus
              />
              <FieldDescription id={TITLE_HELP_ID} className="text-xs">
                Se muestra como encabezado de la alerta en el panel de
                actividad.
              </FieldDescription>
              {titleError && (
                <FieldError id={TITLE_ERROR_ID}>{titleError}</FieldError>
              )}
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor={DESCRIPTION_ID}>Descripción</FieldLabel>
              <Textarea
                id={DESCRIPTION_ID}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Detalle de la falla o del pedido"
                rows={3}
                className="resize-none text-sm"
              />
            </Field>

            <Field className="gap-1.5">
              <FieldLabel htmlFor={OPERATOR_ID}>Operador</FieldLabel>
              <Input
                id={OPERATOR_ID}
                value={operator}
                onChange={(event) => setOperator(event.target.value)}
                aria-describedby={OPERATOR_HELP_ID}
                className="font-mono text-sm"
              />
              <FieldDescription id={OPERATOR_HELP_ID} className="text-xs">
                Cuenta de dominio del operador.
              </FieldDescription>
            </Field>
          </FieldGroup>
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
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FieldGroup className="gap-3">
            <Field className="gap-1.5">
              <FieldLabel htmlFor={RESET_REASON_ID}>
                Motivo del reseteo
              </FieldLabel>
              <Textarea
                id={RESET_REASON_ID}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="resize-none text-sm"
                autoFocus
              />
            </Field>
          </FieldGroup>
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
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cerrar alerta</AlertDialogTitle>
          <AlertDialogDescription>{alertTitle}</AlertDialogDescription>
        </AlertDialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FieldGroup className="gap-3">
            <Field className="gap-1.5">
              <FieldLabel htmlFor={CLOSE_RESOLUTION_ID}>
                Resolución
              </FieldLabel>
              <Textarea
                id={CLOSE_RESOLUTION_ID}
                value={resolution}
                onChange={(event) => setResolution(event.target.value)}
                placeholder="Cómo se resolvió la alerta"
                rows={3}
                className="resize-none text-sm"
                autoFocus
              />
            </Field>
          </FieldGroup>
        </form>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel variant="ghost" size="sm">Cancelar</AlertDialogCancel>
          <Button type="button" size="sm" disabled={!valid} onClick={submit}>
            Confirmar cierre
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
