import { createServer, type IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import chalk from "chalk";
import type { Middleware, Route } from "../router/types";
import { handleRequest } from "./handler";
import { reqlog } from "./logger";
import { log } from "../logger";

const isBun = typeof Bun !== "undefined";

function toReq(req: IncomingMessage, hostname: string): Request {
  const headers = new Headers();
  for (const key in req.headers) {
    const value = req.headers[key];
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(
    `http://${req.headers.host ?? hostname}${req.url ?? "/"}`,
    {
      method: req.method,
      headers,
      body: hasBody
        ? (Readable.toWeb(req) as unknown as ReadableStream)
        : undefined,
      duplex: hasBody ? "half" : undefined,
    } as RequestInit,
  );
}

function desc(
  err: unknown,
  opts: { port: number; hostname: string },
): string {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "EADDRINUSE") {
    return ""; //work on
  }
  if (code === "EACCES") {
    return `Permission denied to listen on port ${opts.port}`;
  }
  return err instanceof Error ? err.message : String(err);
}

export function startServer(
  routes: Route[],
  options: {
    port: number;
    hostname: string;
    forceNode?: boolean;
  },
  middleware: Middleware[] = [],
) {
  const useBun = isBun && !options.forceNode;
  async function fetch(request: Request) {
    const started = performance.now();
    const url = new URL(request.url);
    try {
      const response = await handleRequest(request, routes, middleware);
      reqlog(request, url.pathname, response.status, started);
      return response;
    } catch (error) {
      console.error(error);
      const response = new Response("Internal Server Error", { status: 500 });
      reqlog(request, url.pathname, response.status, started);
      return response;
    }
  }
  if (useBun) {
    try {
      const server = Bun.serve({
        hostname: options.hostname,
        port: options.port,
        fetch,
      });
      console.log(
        `${chalk.bold.cyanBright(`◆ Primdy Server`)}\n- Local:         ${server.url}`,
      );
      return server;
    } catch (err) {
      log.err(desc(err, options));
      process.exit(1);
    }
  }
  /*
    node compatibility start
  */
  const server = createServer(async (req, res) => {
    const response = await fetch(toReq(req, options.hostname));
    res.statusCode = response.status;
    for (const [key, value] of response.headers) {
      if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
    }
    const cookies = response.headers.getSetCookie?.();
    if (cookies?.length) res.setHeader("set-cookie", cookies);
    if (response.body) {
      Readable.fromWeb(response.body as unknown as never).pipe(res);
    } else {
      res.end();
    }
  });
  server.on("error", (err) => {
    log.err(desc(err, options));
    process.exit(1);
  });
  server.listen(options.port, options.hostname, () => {
    console.log(
      `${chalk.bold.yellowBright(`◆ Primdy Server`)}\n- Local:         http://${options.hostname}:${options.port}/`,
    );
    log.warn(
      "Primdy is optimized for Bun, and Node.js compatibility is slower\n  Consider migrating your application: https://bun.sh/",
    );
  });
  return server;
  /*
    node compatibility end
  */
}
