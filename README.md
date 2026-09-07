# Ylode

Blazingly fast, file-system routed API framework optimized for [Bun](https://bun.sh).

## Installation

```bash
bun add ylode
# or
npm install ylode
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
ylode dev
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

For convenience, `ylode` exports few helper functions for creating responses:

```ts
import { json, text, redirect } from "ylode";

json({ hello: "world" });
text("hello");
redirect("/auth");
```

## Cookies

```ts
import { cookies, setCookie, deleteCookie } from "ylode";

export async function GET(request: Request) {
  const theme = cookies(request).get("theme")?.value ?? "light";
  const response = Response.json({ theme });
  return setCookie(response, "theme", theme, { path: "/", httpOnly: true });
}
```

## Configuration

Create a `ylode.config.ts` at your project root:

```ts
import type { YlodeConfig } from "ylode";

export default {
  src: "src",
  port: 3000,
  hostname: "localhost",
  node: false,
} satisfies YlodeConfig;
```

## CLI

```bash
ylode dev
ylode build
ylode start
ylode analyze
```

## Production builds

In production, you probably want to serve `ylode start` instead of `ylode dev`. Use `ylode build` to bundle your application first!
