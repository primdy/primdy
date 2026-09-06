import type { Match, Route } from "./types";

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
        if (parts[index] === undefined) {
          matched = false;
          break;
        }
        params[segment.name] = decodeURIComponent(parts[index]);
        index++;
        continue;
      }
      if (segment.type === "catchAll") {
        if (index >= parts.length) {
          matched = false;
          break;
        }
        params[segment.name] = parts.slice(index).map(decodeURIComponent);
        index = parts.length;
        continue;
      }
      params[segment.name] = parts.slice(index).map(decodeURIComponent);
      index = parts.length;
    }
    if (matched && index === parts.length) return { route, params };
  }
  return null;
}
