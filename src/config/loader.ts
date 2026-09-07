import { join } from "node:path";
import type { YlodeConfig } from "../runtime/types";

export async function loadConfig(
  cwd: string,
  overrides: Partial<YlodeConfig> = {},
): Promise<YlodeConfig> {
  const conf = join(cwd, "ylode.config.ts");
  const loaded = await import(conf).catch(() => ({ default: {} }));
  const config: YlodeConfig = loaded.default ?? {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (config as Record<string, unknown>)[key] = value;
  }
  return config;
}
