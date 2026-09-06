import type { Match, Middleware, Route } from "./types";

export function matchRoute(routes: Route[], pathname: string): Match | null {
  const parts = pathname.split("/").filter(Boolean);
  for (const route of routes) {
    const params: Record<string, string | string[]> = {};
    let index = 0;
    let matched = true;
    for (const segment of route.segments) {
      if (segment.type === "static") {
        if (parts[index] !== segment.value) {
          matched = false;
          break;
        }
        index++;
        continue;
      }
      if (segment.type === "dynamic") {
        const decoded = decode(parts[index]);
        if (decoded === null) {
          matched = false;
          break;
        }
        params[segment.name] = decoded;
        index++;
        continue;
      }
      if (segment.type === "catchAll") {
        if (index >= parts.length) {
          matched = false;
          break;
        }
        const decoded = decodeAll(parts.slice(index));
        if (decoded === null) {
          matched = false;
          break;
        }
        params[segment.name] = decoded;
        index = parts.length;
        continue;
      }
      const decoded = decodeAll(parts.slice(index));
      if (decoded === null) {
        matched = false;
        break;
      }
      params[segment.name] = decoded;
      index = parts.length;
    }
    if (matched && index === parts.length) return { route, params };
  }
  return null;
}

function decode(p: string) {
  try {
    return decodeURIComponent(p);
  } catch {
    return null;
  }
}

function decodeAll(pa: string[]) {
  const decoded: string[] = [];
  for (const p of pa) {
    const value = decode(p);
    if (value === null) return null;
    decoded.push(value);
  }
  return decoded;
}

export function matchMiddleware(middleware: Middleware[], route: Route) {
  return middleware.filter(
    (m) =>
      m.dir === "" || route.dir === m.dir || route.dir.startsWith(`${m.dir}/`),
  );
}
