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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidUsername } from "@/lib/usernames";

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
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {users.length > 0 && (
            <div className="space-y-1.5">
              {users.map((user) => (
                <label key={user} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="net-user"
                    value={user}
                    checked={value === user}
                    onChange={() => setValue(user)}
                    className="accent-primary"
                  />
                  <span className="font-mono">{user}</span>
                </label>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="net-user-input" className="text-xs">
              Usuario
            </Label>
            <Input
              id="net-user-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={64}
              placeholder="Solo letras y números"
              className="h-9 font-mono text-sm"
              autoFocus
            />
            {!valid && value.length > 0 && (
              <p className="text-xs text-destructive">
                Usá solo letras y números, sin dominio ni símbolos.
              </p>
            )}
          </div>
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
