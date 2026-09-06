import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { scanRoutes } from "../router/scanner";
import { writeManifest } from "./manifest";
import { writeTypes } from "./typegen";
import type { Route } from "../router/types";

export async function build(cwd: string, appDir: string) {
  const routes = await scanRoutes(join(cwd, appDir));
  const outputDir = join(cwd, ".ylode");
  const routesDir = join(outputDir, "routes");
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(routesDir, { recursive: true });
  const builtRoutes: Route[] = [];

  for (const [index, route] of routes.entries()) {
    const dir = join(routesDir, String(index));
    const result = await Bun.build({
      entrypoints: [route.file],
      outdir: dir,
      target: "bun",
      format: "esm",
      sourcemap: "external",
    });
    if (!result.success) {
      throw new Error(`Failed to build ${route.pathname}`);
    }
    builtRoutes.push({
      ...route,
      file: join(dir, "route.js"),
    });
  }
  await writeManifest(cwd, builtRoutes);
  await writeTypes(cwd, routes);
  return routes;
}
