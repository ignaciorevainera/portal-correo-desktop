# Implementation Plan: Global Hotkey with Clipboard Autofill & Async Subnet Scanner

## Phase 1: Global Hotkey, Clipboard Parser & Window Restoration
- [x] Task: Unit Tests for Clipboard Pattern Parser (`src/test/clipboardParser.test.ts`) [e377c2a]
- [x] Task: Implement Clipboard Validator Module (`electron/clipboardParser.cjs`) [b335833]
- [x] Task: Register Global Shortcut & IPC Handlers in Electron Main (`electron/main.cjs` & `electron/preload.cjs`) [16bfe7a]
- [~] Task: Integrate Renderer Global Shortcut Listener & Search Auto-Fill in React (`src/App.tsx`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Async Subnet Scanner Core & Reverse DNS Engine
- [ ] Task: Unit Tests for Subnet Scanner & Range Generator (`src/test/subnetScanner.test.ts`)
- [ ] Task: Implement Async Subnet Range Generator & Batch Worker (`electron/subnetScanner.cjs`)
- [ ] Task: Wire IPC Streaming Channels (`subnet-scanner:start`, `subnet-scanner:abort`, `subnet-scanner:host-found`, `subnet-scanner:progress`, `subnet-scanner:done`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Visual Real-Time Subnet Scanner Drawer & UI Integration
- [ ] Task: Unit Tests for Subnet Scanner UI Component (`src/test/SubnetScannerDrawer.test.tsx`)
- [ ] Task: Build `SubnetScannerDrawer` Component (Shadcn Sheet/Drawer, real-time list, progress bar, quick VNC & view buttons)
- [ ] Task: Add "Escanear Subred" Action Button in Main Screen Header/Terminal Bar
- [ ] Task: Run Full Test Suite & Zero-Secrets Audit
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
