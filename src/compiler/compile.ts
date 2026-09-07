import { mkdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { scanMiddleware, scanRoutes } from "../router/scanner";
import { writeManifest } from "./manifest";
import { writeTypes } from "./typegen";
import type { Middleware, Route } from "../router/types";

export async function build(cwd: string, appDir: string) {
  const routes = await scanRoutes(join(cwd, appDir));
  const middleware = await scanMiddleware(join(cwd, appDir));
  const outputDir = join(cwd, ".ylode");
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const routesDir = join(outputDir, "routes");
  const builtRoutes: Route[] = [];
  for (const [index, route] of routes.entries()) {
    builtRoutes.push({
      ...route,
      file: await bundle(route.file, join(routesDir, String(index))),
    });
  }

  const middlewareDir = join(outputDir, "middleware");
  const builtMiddleware: Middleware[] = [];
  for (const [index, entry] of middleware.entries()) {
    builtMiddleware.push({
      ...entry,
      file: await bundle(entry.file, join(middlewareDir, String(index))),
    });
  }

  await writeManifest(cwd, builtRoutes, builtMiddleware);
  await writeTypes(cwd, routes);
  return { routes, middleware };
}

async function bundle(entrypoint: string, outdir: string) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    outdir,
    target: "bun",
    format: "esm",
    minify: { whitespace: true },
    sourcemap: "external",
  });
  if (!result.success) {
    throw new Error(`Failed to build ${entrypoint}`);
  }
  return join(outdir, basename(entrypoint).replace(/\.(ts|js)$/, ".js"));
}
