import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Middleware, Route } from "../router/types";

export type BuildManifest = {
  version: 1;
  routes: Route[];
  middleware: Middleware[];
};

export async function writeManifest(
  cwd: string,
  routes: Route[],
  middleware: Middleware[] = [],
) {
  const dir = join(cwd, ".ylode");
  await mkdir(dir, { recursive: true });

  const manifest: BuildManifest = {
    version: 1,
    routes: routes.map((route) => ({
      ...route,
      file: relative(dir, route.file).replaceAll("\\", "/"),
    })),
    middleware: middleware.map((entry) => ({
      ...entry,
      file: relative(dir, entry.file).replaceAll("\\", "/"),
    })),
  };
  await writeFile(join(dir, "routes.json"), JSON.stringify(manifest));
}

export async function readManifest(cwd: string): Promise<BuildManifest> {
  const dir = join(cwd, ".ylode");
  const file = join(dir, "routes.json");

  const manifest = JSON.parse(await readFile(file, "utf8")) as BuildManifest;
  return {
    ...manifest,
    routes: manifest.routes.map((route) => ({
      ...route,
      file: join(dir, route.file),
    })),
    middleware: (manifest.middleware ?? []).map((entry) => ({
      ...entry,
      file: join(dir, entry.file),
    })),
  };
}
