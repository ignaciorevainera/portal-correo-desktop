# Specification: Migración Integral a Componentes Vanilla de Shadcn UI (Radix UI) y Paleta Estricta del Preset

## 1. Overview
Este track elimina por completo los elementos HTML estilizados manualmente con Tailwind y las sobreescrituras de colores ad-hoc (`bg-slate-950`, `bg-red-950`, `bg-emerald-950`, `bg-amber-600`, etc.) en todo el proyecto, sustituyéndolos por **componentes vanilla de `shadcn/ui` construidos sobre Radix UI** y respetando al 100% la jerarquía de subcomponentes, variantes (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`) y tokens semánticos del preset (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`).

## 2. Functional & UI Requirements

### 2.1 Catálogo Completo de Primitivas Vanilla de `shadcn/ui` (Radix UI)
En `src/components/ui/` deben estar disponibles y estandarizados sobre `@radix-ui/*` y `class-variance-authority`:
- **`button.tsx`**: `Button`, `buttonVariants` (`@radix-ui/react-slot`).
- **`card.tsx`**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`.
- **`badge.tsx`**: `Badge`, `badgeVariants` (`@radix-ui/react-slot`).
- **`input.tsx`**: `Input`.
- **`textarea.tsx`**: `Textarea` vanilla de `shadcn/ui`.
- **`label.tsx`**: `Label` (`@radix-ui/react-label`).
- **`separator.tsx`**: `Separator` (`@radix-ui/react-separator`).
- **`alert.tsx`**: `Alert`, `AlertTitle`, `AlertDescription`.
- **`dialog.tsx`**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` (`@radix-ui/react-dialog`).
- **`kbd.tsx`**: `Kbd` estandarizado con tokens `bg-muted text-muted-foreground border-border font-mono`.

### 2.2 Reemplazo Total por Componentes Vanilla en Todas las Vistas
1. **`NetworkAdCard.tsx` y `HardwareCard.tsx`**:
   - Utilizar estrictamente `<Card size="sm">`, `<CardHeader className="border-b">`, `<CardTitle>`, `<CardAction>` (con `<Badge>`) y `<CardContent>`.
   - Utilizar `<Button variant="ghost" size="icon-xs">` para los botones de copiado y tokens `bg-muted text-foreground border-border` para los bloques de datos.
2. **`QuickActionsBar.tsx`**:
   - Estructurar con `<Card size="sm">`, `<CardHeader>` y `<CardContent>`.
   - Usar `<Alert variant="default" | "destructive">` para el feedback inline y `<Button>` con sus variantes nativas (`default`, `secondary`, `outline`, `destructive`) sin pisar los colores del preset.
3. **`LivePingConsole.tsx`**:
   - Eliminar el contenedor `bg-slate-950` y botones `bg-red-950` / `bg-emerald-950`.
   - Reemplazar por `<Card size="sm">`, `<CardHeader className="border-b">`, `<CardTitle>`, `<CardAction>` (con `<Button variant={isPinging ? "destructive" : "default"} size="xs">`, `<Button variant="outline" size="xs">` para Limpiar y `<Button variant={copied ? "secondary" : "outline"} size="xs">` para Copiar Logs) y `<CardContent>` con un visor `bg-muted/50 text-foreground border border-border rounded-md` que obedece al tema claro/oscuro del preset.
4. **`AlertsPanel.tsx` y `ResetUptimePanel.tsx`**:
   - Reemplazar todos los `<label>`, `<input>`, `<textarea>` y tarjetas manuales por `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardAction>`, `<CardContent>`, `<Label>`, `<Input>`, `<Textarea>`, `<Button>`, `<Badge>`, `<Separator>` y `<Alert>`.
5. **`InfoModal.tsx`**:
   - Reemplazar el modal manual por `<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogFooter>`, `<Alert>`, `<Card>`, `<Badge>` y `<Button>` de `shadcn/ui`.
6. **`SecurityLockScreen.tsx`**:
   - Reemplazar toda la pantalla de bloqueo manual por `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardDescription>`, `<CardContent>`, `<CardFooter>`, `<Alert variant="destructive">`, `<Label>`, `<Input>` y `<Button>` de `shadcn/ui`.
7. **`Topbar.tsx`, `OperatorContextMenu.tsx` y `App.tsx`**:
   - Reemplazar los `<button>` nativos, divisores manuales y `<kbd>` por `<Button>`, `<Separator>`, `<Badge>`, `<Input>`, `<Kbd>` y `<Card>` de `shadcn/ui`.
