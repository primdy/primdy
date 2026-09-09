import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { parseRoute } from "./parser";
import type { Boundary, Middleware, Route } from "./types";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

async function listFiles(dir: string): Promise<Dirent[]> {
  return readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
}

function fullpath(r: Dirent): string {
  return join(
    (r.parentPath ?? (r as { path?: string }).path) as string,
    r.name,
  );
}

export async function scanRoutes(src: string): Promise<Route[]> {
  const routes: Route[] = [];
  for (const r of await listFiles(src)) {
    if (!r.isFile()) continue;
    if (r.name !== "route.ts" && r.name !== "route.js") continue;
    const file = fullpath(r);
    const rel = relative(src, file);
    const parsed = parseRoute(rel);
    if (!parsed) continue;
    routes.push({
      id: rel.replaceAll("/", ":").replace(/\.(ts|js)$/, ""),
      file,
      dir: parsed.dir,
      pathname: parsed.pathname,
      segments: parsed.segments,
      methods,
    });
  }
  return routes.sort(compareRoutes);
}

export async function scanMiddleware(src: string): Promise<Middleware[]> {
  return scanBoundary(src, /^(middleware|proxy)\.(ts|js)$/);
}

export async function scanNotFound(src: string): Promise<Boundary[]> {
  return scanBoundary(src, /^not-found\.(ts|js)$/);
}

export async function scanError(src: string): Promise<Boundary[]> {
  return scanBoundary(src, /^error\.(ts|js)$/);
}

async function scanBoundary(src: string, test: RegExp): Promise<Boundary[]> {
  const entries: Boundary[] = [];
  for (const entry of await listFiles(src)) {
    if (!entry.isFile()) continue;
    if (!test.test(entry.name)) continue;
    const file = fullpath(entry);
    const dir = relative(src, dirname(file)).replaceAll("\\", "/");
    entries.push({ file, dir: dir === "." ? "" : dir });
  }
  return entries.sort((a, b) => a.dir.length - b.dir.length);
}

function compareRoutes(a: Route, b: Route) {
  const rank = (route: Route) =>
    route.segments.reduce((n, segment) => {
      if (segment.type === "static") return n + 1000;
      if (segment.type === "dynamic") return n + 100;
      if (segment.type === "catchAll") return n + 10;
      return n;
    }, route.segments.length);

  return rank(b) - rank(a);
}
