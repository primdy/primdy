import { access } from "node:fs/promises";
import { join } from "node:path";
import type { YlodeConfig } from "../runtime/types";

async function scan(cwd: string) {
  for (const p of ["ylode.config.ts", "ylode.config.js", "ylode.config.mjs"]) {
    const conf = join(cwd, p);
    try {
      await access(conf);
      return conf;
    } catch {
      continue;
    }
  }
  return null;
}

export async function loadConfig(
  cwd: string,
  overrides: Partial<YlodeConfig> = {},
): Promise<YlodeConfig> {
  const conf = await scan(cwd);
  const loaded = conf
    ? await import(conf).catch(() => ({ default: {} }))
    : { default: {} };
  const config: YlodeConfig = loaded.default ?? {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (config as Record<string, unknown>)[key] = value;
  }
  return config;
}
