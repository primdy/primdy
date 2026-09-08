import { access } from "node:fs/promises";
import { join } from "node:path";
import type { PrimdyConfig } from "../runtime/types";

async function scan(cwd: string) {
  for (const p of ["primdy.config.ts", "primdy.config.js", "primdy.config.mjs"]) {
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
  overrides: Partial<PrimdyConfig> = {},
): Promise<PrimdyConfig> {
  const conf = await scan(cwd);
  const loaded = conf
    ? await import(conf).catch(() => ({ default: {} }))
    : { default: {} };
  const config: PrimdyConfig = loaded.default ?? {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (config as Record<string, unknown>)[key] = value;
  }
  return config;
}
