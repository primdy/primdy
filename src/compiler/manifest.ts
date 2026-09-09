import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { Boundary, Middleware, Route } from "../router/types";

export type BuildManifest = {
  version: 1;
  routes: Route[];
  middleware: Middleware[];
  notFound: Boundary[];
  error: Boundary[];
};

function toRelative(dir: string, entries: Boundary[]): Boundary[] {
  return entries.map((entry) => ({
    ...entry,
    file: relative(dir, entry.file).replaceAll("\\", "/"),
  }));
}
function toAbsolute(dir: string, entries: Boundary[] = []): Boundary[] {
  return entries.map((entry) => ({ ...entry, file: join(dir, entry.file) }));
}

export async function writeManifest(
  cwd: string,
  routes: Route[],
  middleware: Middleware[] = [],
  notFound: Boundary[] = [],
  errorPages: Boundary[] = [],
) {
  const dir = join(cwd, ".primdy");
  await mkdir(dir, { recursive: true });

  const manifest: BuildManifest = {
    version: 1,
    routes: routes.map((route) => ({
      ...route,
      file: relative(dir, route.file).replaceAll("\\", "/"),
    })),
    middleware: toRelative(dir, middleware),
    notFound: toRelative(dir, notFound),
    error: toRelative(dir, errorPages),
  };
  await writeFile(join(dir, "routes.json"), JSON.stringify(manifest));
}

export async function readManifest(cwd: string): Promise<BuildManifest> {
  const dir = join(cwd, ".primdy");
  const file = join(dir, "routes.json");

  const manifest = JSON.parse(await readFile(file, "utf8")) as BuildManifest;
  return {
    ...manifest,
    routes: manifest.routes.map((route) => ({
      ...route,
      file: join(dir, route.file),
    })),
    middleware: toAbsolute(dir, manifest.middleware),
    notFound: toAbsolute(dir, manifest.notFound),
    error: toAbsolute(dir, manifest.error),
  };
}
