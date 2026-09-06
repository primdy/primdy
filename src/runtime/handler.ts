import type { HTTPMethod, RouteContext } from "./types";
import { matchRoute } from "../router/matcher";
import type { Route } from "../router/types";

const methods: HTTPMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export async function handleRequest(request: Request, routes: Route[]) {
  const url = new URL(request.url);
  const match = matchRoute(routes, url.pathname);
  if (!match) {
    return new Response("Not Found", { status: 404 });
  }

  const method = request.method as HTTPMethod;
  if (!methods.includes(method)) {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: match.route.methods.join(", ") },
    });
  }

  const mod = await import(match.route.file);
  const handler = mod[method];
  if (typeof handler !== "function") {
    const allowed = methods.filter((name) => typeof mod[name] === "function");
    if (!allowed.length)
      return new Response("Method Not Allowed", { status: 405 });
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: allowed.join(", ") },
    });
  }
  return handler(request, {
    params: match.params,
  } satisfies RouteContext);
}
