# Implementation Plan: UI Polish, Subnet Drawer, Character Encoding & Uptime Refactor

## Phase 1: Test Suite & Subprocess Character Decoding (TDD)
- [ ] Task: Create unit tests for CP850/Windows-1252 character decoders in `electron/systemTools.cjs`
- [ ] Task: Implement robust binary buffer decoding in `electron/systemTools.cjs` to handle CP850 bytes (`Estadísticas`, `Mínimo`, `Máximo`, `milisegundos`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Topbar Branding & Technical Card Space Optimization
- [ ] Task: Ensure `src/assets/icon.png` is placed and import it directly into `src/components/Topbar.tsx`
- [ ] Task: Remove `<CardHeader>` and redundant online/architecture badges from `src/components/TerminalTechnicalCard.tsx`
- [ ] Task: Update/add unit tests for `Topbar` and `TerminalTechnicalCard`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: QuickActionsBar Actions & Uptime Refresh
- [ ] Task: Add "Escanear Subred" button to `src/components/QuickActionsBar.tsx`
- [ ] Task: Add refresh uptime button (`RotateCcw`) and handler in `src/components/QuickActionsBar.tsx` and wire in `src/App.tsx`
- [ ] Task: Update unit tests in `src/components/QuickActionsBar.test.tsx` (or new test file)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Subnet Scanner Drawer Full Overlay Restyling
- [ ] Task: Update `src/components/SubnetScannerDrawer.tsx` to standard full-height drawer (`fixed inset-0 z-50` with backdrop)
- [ ] Task: Update tests asserting the full-screen overlay drawer behavior
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Account Reset Panel Table Refactor
- [ ] Task: Refactor `src/components/ResetUptimePanel.tsx` to remove the uptime card, compact the request form, and display reset history in a table styled after `AlertsPanel`
- [ ] Task: Create/update unit tests for `ResetUptimePanel` table and empty state
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
