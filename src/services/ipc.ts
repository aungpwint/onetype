import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export type InvokeArgs = Record<string, unknown>;

export async function invokeCommand<T>(command: string, args: InvokeArgs = {}): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("Tauri runtime not available. Use the local backend instead.");
  }
  return invoke<T>(command, args);
}

export async function pickOpenFile(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const result = await open({ multiple: false, filters: [{ name: "OneType Backup", extensions: ["json"] }] });
  return typeof result === "string" ? result : null;
}

export async function pickSavePath(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  return await save({
    defaultPath: `onetype-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "OneType Backup", extensions: ["json"] }],
  });
}