import type { MonitorApi } from './monitor';

declare global {
  interface Window {
    monitorAPI?: MonitorApi;
  }
}

export {};
