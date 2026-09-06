import type { Segment } from "./types";

export function parseRoute(relative: string) {
  const parts = relative.replaceAll("\\", "/").split("/");
  if (parts.at(-1) !== "route.ts" && parts.at(-1) !== "route.js") return null;
  parts.pop();
  const dir = parts.join("/");

  const segments: Segment[] = [];
  for (const part of parts) {
    if (!part || /^\(.+\)$/.test(part)) continue;
    if (/^\[\[\.\.\..+\]\]$/.test(part)) {
      segments.push({ type: "optionalCatchAll", name: part.slice(5, -2) });
      continue;
    }
    if (/^\[\.\.\..+\]$/.test(part)) {
      segments.push({ type: "catchAll", name: part.slice(4, -1) });
      continue;
    }
    if (/^\[.+\]$/.test(part)) {
      segments.push({ type: "dynamic", name: part.slice(1, -1) });
      continue;
    }
    segments.push({ type: "static", value: part });
  }

  return {
    dir,
    segments,
    pathname: segments.length
      ? "/" +
        segments
          .map((segment) => {
            if (segment.type === "static") return segment.value;
            if (segment.type === "dynamic") return `[${segment.name}]`;
            if (segment.type === "catchAll") return `[...${segment.name}]`;
            return `[[...${segment.name}]]`;
          })
          .join("/")
      : "/",
  };
}
