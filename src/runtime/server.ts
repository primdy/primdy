import chalk from "chalk";
import type { Route } from "../router/types";
import { handleRequest } from "./handler";
import { reqlog } from "./logger";

export function startServer(
  routes: Route[],
  options: {
    port: number;
    hostname: string;
  },
) {
  const server = Bun.serve({
    hostname: options.hostname,
    port: options.port,
    async fetch(request) {
      const started = performance.now();
      const url = new URL(request.url);
      try {
        const response = await handleRequest(request, routes);
        reqlog(request, url.pathname, response.status, started);
        return response;
      } catch (error) {
        console.error(error);
        const response = new Response("Internal Server Error", {
          status: 500,
        });
        reqlog(request, url.pathname, response.status, started);
        return response;
      }
    },
  });
  console.log(
    `${chalk.bold.yellowBright(`◆ Ylode Server`)}\n- Local:         ${server.url}`,
  );
  return server;
}
