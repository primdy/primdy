import { join } from "node:path";
import type { YlodeConfig } from "../runtime/types";

export async function loadConfig(cwd: string): Promise<YlodeConfig> {
  const file = join(cwd, "ylode.config.ts");
  const loaded = await import(file).catch(() => ({ default: {} }));
  return loaded.default ?? {};
}
