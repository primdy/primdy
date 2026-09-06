import { join, relative } from "node:path";
import { parseRoute } from "./parser";
import type { Route } from "./types";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export async function scanRoutes(appDir: string): Promise<Route[]> {
  const routes: Route[] = [];
  for await (const entry of walk(appDir)) {
    if (!entry.endsWith("/route.ts") && !entry.endsWith("/route.js")) continue;
    const rel = relative(appDir, entry);
    const parsed = parseRoute(rel);
    if (!parsed) continue;
    routes.push({
      id: rel.replaceAll("/", ":").replace(/\.(ts|js)$/, ""),
      file: entry,
      pathname: parsed.pathname,
      segments: parsed.segments,
      methods,
    });
  }
  return routes.sort(compareRoutes);
}

async function* walk(dir: string): AsyncGenerator<string> {
  for await (const entry of new Bun.Glob("**/route.{ts,js}").scan({
    cwd: dir,
    absolute: true,
  })) {
    yield entry;
  }
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
