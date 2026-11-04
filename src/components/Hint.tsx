import React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface HintProps {
  /** Descripción de ayuda; nunca reemplaza al `aria-label` del hijo. */
  label: string;
  children: React.ReactElement;
}

/**
 * Tooltip de una línea para controles que antes usaban `title=`.
 * El `aria-label` del hijo se conserva como nombre accesible; Radix expone
 * `label` como `aria-describedby` **sólo mientras el tooltip está abierto**.
 *
 * Monta su propio `TooltipProvider` (anidable) a propósito: el control debe
 * funcionar renderizado aislado (tests y superficies sueltas). El `delayDuration`
 * queda pinneado en 0 para no depender de la demora del provider global de
 * `main.tsx`; si esa demora cambia, hay que quitar este pin.
 */
export function Hint({ label, children }: HintProps): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        {/*
         * Trigger de Radix directo: el wrapper de `ui/tooltip` fija
         * `data-slot="tooltip-trigger"` y, al usar `asChild`, pisa el
         * `data-slot="button"` del hijo. Se conserva así el contrato de slots.
         */}
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
