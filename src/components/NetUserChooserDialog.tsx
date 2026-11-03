import React, { useEffect, useState } from "react";
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
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isValidUsername } from "@/lib/usernames";

const NET_USER_INPUT_ID = "net-user-input";
const NET_USER_INPUT_ERROR_ID = "net-user-input-error";
const NET_USER_OPTION_ID_PREFIX = "net-user-option-";

interface NetUserChooserDialogProps {
  open: boolean;
  users: string[];
  initialUser?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (user: string) => void;
}

export function NetUserChooserDialog({
  open,
  users,
  initialUser,
  onOpenChange,
  onSubmit,
}: NetUserChooserDialogProps): React.JSX.Element {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialUser ?? users[0] ?? "");
    }
  }, [open, initialUser, users]);

  const valid = isValidUsername(value);

  const submit = (): void => {
    if (!valid) return;
    onSubmit(value.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Consultar cuenta AD</DialogTitle>
          <DialogDescription>
            Elegí un usuario de la ficha o escribí otro del dominio.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {users.length > 0 && (
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Usuarios sugeridos</FieldLegend>
              <FieldGroup className="gap-3">
                {users.map((user, index) => (
                  <div key={user} className="flex items-center gap-2">
                    <input
                      id={`${NET_USER_OPTION_ID_PREFIX}${index}`}
                      type="radio"
                      name="net-user"
                      value={user}
                      checked={value === user}
                      onChange={() => setValue(user)}
                      className="accent-primary"
                    />
                    <FieldLabel
                      htmlFor={`${NET_USER_OPTION_ID_PREFIX}${index}`}
                      className="font-mono text-sm"
                    >
                      {user}
                    </FieldLabel>
                  </div>
                ))}
              </FieldGroup>
            </FieldSet>
          )}

          <Field className="gap-1.5" data-invalid={!valid && value.length > 0}>
            <FieldLabel htmlFor={NET_USER_INPUT_ID}>Usuario</FieldLabel>
            <Input
              id={NET_USER_INPUT_ID}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={64}
              placeholder="Solo letras y números"
              aria-invalid={!valid && value.length > 0}
              aria-describedby={
                !valid && value.length > 0
                  ? NET_USER_INPUT_ERROR_ID
                  : undefined
              }
              className="font-mono text-sm"
              autoFocus
            />
            {!valid && value.length > 0 && (
              <FieldError
                id={NET_USER_INPUT_ERROR_ID}
                className="text-xs"
              >
                Usá solo letras y números, sin dominio ni símbolos.
              </FieldError>
            )}
          </Field>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={!valid} onClick={submit}>
            Consultar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
