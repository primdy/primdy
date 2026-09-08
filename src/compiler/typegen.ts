import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Route } from "../router/types";

export async function writeTypes(cwd: string, routes: Route[]) {
  const dir = join(cwd, ".primdy");
  await mkdir(dir, { recursive: true });

  const paths = routes.map((route) => `"${route.pathname}"`).join(" | ");
  const output = `export type PrimdyRoute = ${paths || "never"};\n`;
  await writeFile(join(dir, "routes.d.ts"), output);
}
