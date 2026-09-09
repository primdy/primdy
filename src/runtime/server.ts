import { createServer, type IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import chalk from "chalk";
import type { Boundary, Middleware, Route } from "../router/types";
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

function portused(err: unknown): boolean {
  return (err as NodeJS.ErrnoException | undefined)?.code === "EADDRINUSE";
}
function desc(err: unknown, opts: { port: number; hostname: string }): string {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "EADDRINUSE") {
    return `Port ${opts.port} is already in use`;
  }
  if (code === "EACCES") {
    return `Permission denied to listen on port ${opts.port}`;
  }
  return err instanceof Error ? err.message : String(err);
}

function sigint(close: () => void) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    try {
      close();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

export function startServer(
  routes: Route[],
  options: {
    port: number;
    hostname: string;
    forceNode?: boolean;
  },
  middleware: Middleware[] = [],
  notFound: Boundary[] = [],
  errorPages: Boundary[] = [],
) {
  const useBun = isBun && !options.forceNode;
  async function fetch(request: Request) {
    const started = performance.now();
    const url = new URL(request.url);
    try {
      const response = await handleRequest(
        request,
        routes,
        middleware,
        notFound,
        errorPages,
      );
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
    let port = options.port;
    for (let attempt = 0; attempt <= 5; attempt++) {
      try {
        const server = Bun.serve({
          hostname: options.hostname,
          port,
          fetch,
        });
        console.log(
          `${chalk.bold.cyanBright(`◆ Primdy Server`)}\n- Local:         ${server.url}`,
        );
        sigint(() => server.stop(true));
        return server;
      } catch (err) {
        if (!portused(err) || attempt === 5) {
          log.err(desc(err, { ...options, port }));
          process.exit(1);
        }
        const nextPort = port + 1;
        log.warn(`Port ${port} is in use, using ${nextPort} instead`);
        port = nextPort;
      }
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
  let port = options.port;
  let attempt = 0;
  const listen = () => {
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (portused(err) && attempt < 5) {
        attempt++;
        const nextPort = port + 1;
        log.warn(`Port ${port} is in use, using ${nextPort} instead`);
        port = nextPort;
        listen();
        return;
      }
      log.err(desc(err, { ...options, port }));
      process.exit(1);
    });
    server.listen(port, options.hostname, () => {
      console.log(
        `${chalk.bold.yellowBright(`◆ Primdy Server`)}\n- Local:         http://${options.hostname}:${port}/`,
      );
      log.warn(
        "Primdy is optimized for Bun, and Node.js compatibility is slower\n  Consider migrating your application: https://bun.sh/",
      );
    });
  };
  listen();
  sigint(() => {
    server.closeAllConnections?.();
    server.close();
  });
  return server;
  /*
    node compatibility end
  */
}
