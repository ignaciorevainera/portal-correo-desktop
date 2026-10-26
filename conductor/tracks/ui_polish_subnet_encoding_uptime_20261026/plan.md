# Implementation Plan: UI Polish, Subnet Drawer, Character Encoding & Uptime Refactor

## Phase 1: Test Suite & Subprocess Character Decoding (TDD) [checkpoint: d0ce9b1]
- [x] Task: Create unit tests for CP850/Windows-1252 character decoders in `electron/systemTools.cjs`
- [x] Task: Implement robust binary buffer decoding in `electron/systemTools.cjs` to handle CP850 bytes (`Estadísticas`, `Mínimo`, `Máximo`, `milisegundos`) a1cdb54
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) d0ce9b1

## Phase 2: Topbar Branding & Technical Card Space Optimization [checkpoint: cec0920]
- [x] Task: Ensure `src/assets/icon.png` is placed and import it directly into `src/components/Topbar.tsx` cec0920
- [x] Task: Remove `<CardHeader>` and redundant online/architecture badges from `src/components/TerminalTechnicalCard.tsx` cec0920
- [x] Task: Update/add unit tests for `Topbar` and `TerminalTechnicalCard` cec0920
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) cec0920

## Phase 3: QuickActionsBar Actions & Uptime Refresh [checkpoint: dd76afb]
- [x] Task: Add "Escanear Subred" button to `src/components/QuickActionsBar.tsx` dd76afb
- [x] Task: Add refresh uptime button (`RotateCcw`) and handler in `src/components/QuickActionsBar.tsx` and wire in `src/App.tsx` dd76afb
- [x] Task: Update unit tests in `src/components/QuickActionsBar.test.tsx` (or new test file) dd76afb
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) dd76afb

## Phase 4: Subnet Scanner Drawer Full Overlay Restyling [checkpoint: 3b60d7f]
- [x] Task: Update `src/components/SubnetScannerDrawer.tsx` to standard full-height drawer (`fixed inset-0 z-50` with backdrop) 3b60d7f
- [x] Task: Update tests asserting the full-screen overlay drawer behavior 3b60d7f
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) 3b60d7f

## Phase 5: Account Reset Panel Table Refactor
- [ ] Task: Refactor `src/components/ResetUptimePanel.tsx` to remove the uptime card, compact the request form, and display reset history in a table styled after `AlertsPanel`
- [ ] Task: Create/update unit tests for `ResetUptimePanel` table and empty state
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
