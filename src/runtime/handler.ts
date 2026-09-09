import type {
  ErrorModule,
  HTTPMethod,
  MiddlewareModule,
  NotFoundModule,
  RouteContext,
} from "./types";
import { matchBoundary, matchMiddleware, matchRoute } from "../router/matcher";
import type { Boundary, Middleware, Route } from "../router/types";

const methods: HTTPMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export async function handleRequest(
  request: Request,
  routes: Route[],
  middleware: Middleware[] = [],
  notFound: Boundary[] = [],
  errorPages: Boundary[] = [],
) {
  const url = new URL(request.url);
  const match = matchRoute(routes, url.pathname);
  if (!match) {
    return renderNotFound(request, notFound, url.pathname);
  }

  try {
    for (const entry of matchMiddleware(middleware, match.route)) {
      const mod = (await import(entry.file)) as MiddlewareModule;
      const handler = mod.default ?? mod.middleware ?? mod.proxy;
      if (typeof handler !== "function") continue;
      const result = await handler(request, { params: match.params });
      if (result) return result;
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
    return await handler(request, {
      params: match.params,
    } satisfies RouteContext);
  } catch (error) {
    return renderError(request, error, errorPages, match.route.dir);
  }
}

async function renderNotFound(
  request: Request,
  entries: Boundary[],
  pathname: string,
) {
  const boundary = matchBoundary(entries, pathname.replace(/^\/+/, ""));
  if (boundary) {
    try {
      const mod = (await import(boundary.file)) as NotFoundModule;
      const handler = mod.default ?? mod.notFound;
      if (typeof handler === "function") {
        const result = await handler(request, { params: {} });
        if (result) return result;
      }
    } catch (error) {
      console.error(error);
    }
  }
  return new Response("Not Found", { status: 404 });
}

async function renderError(
  request: Request,
  error: unknown,
  entries: Boundary[],
  dir: string,
) {
  console.error(error);
  const boundary = matchBoundary(entries, dir);
  if (boundary) {
    try {
      const mod = (await import(boundary.file)) as ErrorModule;
      const handler = mod.default ?? mod.error;
      if (typeof handler === "function") {
        const result = await handler(request, error);
        if (result) return result;
      }
    } catch (nested) {
      console.error(nested);
    }
  }
  return new Response("Internal Server Error", { status: 500 });
}
