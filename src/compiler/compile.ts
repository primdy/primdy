import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { build as esbuild } from "esbuild";
import {
  scanError,
  scanMiddleware,
  scanNotFound,
  scanRoutes,
} from "../router/scanner";
import { writeManifest } from "./manifest";
import { writeTypes } from "./typegen";
import type { Boundary, Route } from "../router/types";

export async function build(cwd: string, src: string) {
  const routes = await scanRoutes(join(cwd, src));
  const middleware = await scanMiddleware(join(cwd, src));
  const notFound = await scanNotFound(join(cwd, src));
  const errorPages = await scanError(join(cwd, src));
  const outputDir = join(cwd, ".primdy");
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

  const builtMiddleware = await bundleBoundaries(
    middleware,
    join(outputDir, "middleware"),
  );
  const builtNotFound = await bundleBoundaries(
    notFound,
    join(outputDir, "not-found"),
  );
  const builtError = await bundleBoundaries(
    errorPages,
    join(outputDir, "error"),
  );
  await writeManifest(
    cwd,
    builtRoutes,
    builtMiddleware,
    builtNotFound,
    builtError,
  );
  await writeTypes(cwd, routes);
  return {
    routes: builtRoutes,
    middleware: builtMiddleware,
    notFound: builtNotFound,
    error: builtError,
  };
}

async function bundleBoundaries(
  entries: Boundary[],
  outdir: string,
): Promise<Boundary[]> {
  const built: Boundary[] = [];
  for (const [index, entry] of entries.entries()) {
    built.push({
      ...entry,
      file: await bundle(entry.file, join(outdir, String(index))),
    });
  }
  return built;
}

async function bundle(entrypoint: string, outdir: string) {
  const result = await esbuild({
    entryPoints: [entrypoint],
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    //minifyWhitespace: true,
    sourcemap: "external",
    logLevel: "silent",
  });
  if (result.errors.length) {
    throw new Error(`Failed to build ${entrypoint}`);
  }
  const outfile = join(
    outdir,
    basename(entrypoint).replace(/\.(ts|js)$/, ".js"),
  );
  await minifymap(`${outfile}.map`);
  return outfile;
}

async function minifymap(map: string) {
  const contents = await readFile(map, "utf8");
  await writeFile(map, JSON.stringify(JSON.parse(contents)));
}
