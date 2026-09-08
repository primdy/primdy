# Primdy

Blazingly fast, file-system routed API framework optimized for [Bun](https://bun.sh).

## Installation

```bash
bun add primdy
# or
npm install primdy
```

## Quickstart

Create a route by adding a `route.ts` file under `src/` (or whatever `src` you configure) and exporting an HTTP method handler:

```ts
// src/route.ts
export async function GET() {
  return Response.json({ ok: true });
}
```

Start the dev server:

```bash
primdy dev
```

That's it! You can now make a request to `http://localhost:3000/` and expect `{"ok": true}`.

## Routing

Routes are defined by `route.ts` files. Each exported HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) becomes a handler for that method.

The syntax is the same as Next.js's API routes in App Router, with the exception that you return `Response` instead of `NextResponse`:

```ts
// src/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  return Response.json({ id: params.id });
}
```

Catch-all and optional catch-all segments also produce a `string[]` param instead of a `string`:

```ts
// src/docs/[...slug]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { slug: string[] } },
) {
  return Response.json({ slug: params.slug });
}
```

## Middleware

Use a `middleware.ts` or `proxy.ts` file to run code before every route in that directory. Export a `default`, `middleware`, or `proxy` function:

```ts
// src/users/proxy.ts
export function proxy(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

## Helpers

For convenience, `primdy` exports few helper functions for creating responses:

```ts
import { json, text, redirect } from "primdy";

json({ hello: "world" });
text("hello");
redirect("/auth");
```

## Cookies

```ts
import { cookies, setCookie, deleteCookie } from "primdy";

export async function GET(request: Request) {
  const theme = cookies(request).get("theme")?.value ?? "light";
  const response = Response.json({ theme });
  return setCookie(response, "theme", theme, { path: "/", httpOnly: true });
}
```

## Configuration

Create a `primdy.config.ts` at your project root:

```ts
import type { PrimdyConfig } from "primdy";

export default {
  src: "src",
  port: 3000,
  hostname: "localhost",
  node: false,
} satisfies PrimdyConfig;
```

## CLI

```bash
primdy dev
primdy build
primdy start
primdy analyze
```

## Production builds

In production, you probably want to serve `primdy start` instead of `primdy dev`. Use `primdy build` to bundle your application first!
