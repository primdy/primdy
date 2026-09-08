#!/usr/bin/env node

import { access, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Command } from "commander";
import chalk from "chalk";

import { build } from "../compiler/compile";
import { loadConfig } from "../config/loader";
import { log, ready } from "../logger";
import { readManifest } from "../compiler/manifest";
import { scanMiddleware, scanRoutes } from "../router/scanner";
import { startServer } from "../runtime/server";
import { makeTrees } from "../utils";
import pkg from "../../package.json";

import type { PrimdyConfig } from "../runtime/types";

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const isBun = typeof process !== "undefined" && !!process.versions?.bun;
if (!isBun) {
  const argForce =
    process.argv.includes("--node") || process.argv.includes("-N");
  const forcedNode =
    argForce ||
    (await loadConfig(process.cwd())
      .then((config) => config.node === true)
      .catch(() => false));
  if (!forcedNode) {
    try {
      const proc = fileURLToPath(import.meta.url);
      const result = spawnSync("bun", [proc, ...process.argv.slice(2)], {
        stdio: "inherit",
        env: process.env,
      });
      process.exit(result.status ?? 0);
    } catch {
      //
    }
  }
}

process.on("uncaughtException", (error) => {
  log.err(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log.err(reason instanceof Error ? reason.message : String(reason));
  process.exit(1);
});

const program = new Command();
program
  .name("primdy")
  .description("Blazingly fast, file-system routed API framework")
  .version(pkg.version)
  .helpOption("-h, --help", "Display help")
  .helpCommand("help", "Displays this message.");

async function getProject(
  directory: string,
  overrides: Partial<PrimdyConfig> = {},
) {
  const cwd = resolve(process.cwd(), directory);
  const config = await loadConfig(cwd, {
    port: Number(process.env.PORT) || undefined,
    hostname: process.env.HOSTNAME,
    ...overrides,
  });
  const src = config.src ?? "src";
  const appPath = join(cwd, src);
  const port = config.port ?? 3000;
  const hostname = config.hostname ?? "localhost";
  return {
    cwd,
    config,
    src,
    appPath,
    port,
    hostname,
  };
}

function argOverride(opts: {
  port?: string;
  hostname?: string;
  node?: boolean;
}): Partial<PrimdyConfig> {
  const overrides: Partial<PrimdyConfig> = {};
  if (opts.port !== undefined) overrides.port = Number(opts.port);
  if (opts.hostname !== undefined) overrides.hostname = opts.hostname;
  if (opts.node !== undefined) overrides.node = opts.node;
  return overrides;
}

async function exists(appPath: string) {
  try {
    await access(appPath);
  } catch {
    return false;
  }
  const routes = await readdir(appPath, {
    recursive: true,
    withFileTypes: true,
  }).catch(() => []);
  return routes.some(
    (r) => r.isFile() && (r.name === "route.ts" || r.name === "route.js"),
  );
}

async function requireProject(appPath: string) {
  if (await exists(appPath)) return true;
  log.err(`No application found\n  Cannot find ${appPath}`);
  return false;
}

program
  .command("dev")
  .argument("[directory]", "Application directory", ".")
  .description("Starts the development server.")
  .option("-p, --port <port>", "Port to listen on")
  .option("-H, --hostname <hostname>", "Hostname to listen on")
  .option("-N, --node", "Force the Node.js runtime")
  .action(async (directory, options) => {
    const t1 = performance.now();
    const project = await getProject(directory, argOverride(options));
    if (!(await requireProject(project.appPath))) {
      process.exit(1);
    }
    const routes = await scanRoutes(project.appPath);
    const middleware = await scanMiddleware(project.appPath);
    startServer(
      routes,
      {
        port: project.port,
        hostname: project.hostname,
        forceNode: project.config.node,
      },
      middleware,
    );
    ready(t1);
  });

program
  .command("build")
  .argument("[directory]", "Application directory", ".")
  .description("Creates a production build of your application.")
  .action(async (directory) => {
    const t1 = performance.now();
    const project = await getProject(directory);
    if (!(await requireProject(project.appPath))) {
      process.exit(1);
    }
    try {
      const { routes, middleware } = await build(project.cwd, project.src);
      await makeTrees([
        {
          title: "Routes",
          entries: routes.map((route) => ({
            label: route.pathname,
            file: route.file,
          })),
        },
        {
          title: "Middleware",
          entries: middleware.map((entry) => ({
            label: entry.dir ? `/${entry.dir}` : "/",
            file: entry.file,
          })),
        },
      ]);
      const bMs = performance.now() - t1;
      const bTime =
        bMs >= 1000 ? `${(bMs / 1000).toFixed(1)}s` : `${Math.round(bMs)}ms`;
      log.success(`Built ${routes.length} routes in ${bTime}`);
    } catch (error) {
      log.err(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("start")
  .argument("[directory]", "Application directory", ".")
  .description("Starts the production server.")
  .option("-p, --port <port>", "Port to listen on")
  .option("-H, --hostname <hostname>", "Hostname to listen on")
  .option("-N, --node", "Force the Node.js runtime")
  .action(async (directory, options) => {
    const t1 = performance.now();
    const project = await getProject(directory, argOverride(options));
    try {
      const manifest = await readManifest(project.cwd);
      startServer(
        manifest.routes,
        {
          port: project.port,
          hostname: project.hostname,
          forceNode: project.config.node,
        },
        manifest.middleware,
      );
      ready(t1);
    } catch {
      log.err(
        `No production build found\n  Run ${chalk.bold("primdy build")} to build your application`,
      );
      process.exit(1);
    }
  });

program
  .command("analyze")
  .argument("[directory]", "Application directory", ".")
  .description("Analyzes application routes.")
  .action(async (directory) => {
    const project = await getProject(directory);
    if (!(await requireProject(project.appPath))) {
      process.exit(1);
    }
    const routes = await scanRoutes(project.appPath);
    for (const route of routes) {
      console.log(`${route.pathname}  ${route.file}`);
    }
  });

await program.parseAsync();
