#!/usr/bin/env bun

import { rm, readdir } from "node:fs/promises";
import { join } from "node:path";

if (typeof Bun === "undefined") {
  console.log("Ylode cannot be built without Bun");
  process.exit(1);
}

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");

async function clean() {
  await rm(dist, { recursive: true, force: true });
}

const opts = {
  target: "bun" as const, //"node" breaking icons rn
  packages: "bundle" as const,
  external: ["esbuild"],
  sourcemap: "none" as const,
  //minify: { whitespace: true, syntax: true, identifiers: true },
  minify: true,
  drop: ["debugger"],
};

async function makeLib(entrypoint: string, outdir: string) {
  const result = await Bun.build({
    ...opts,
    entrypoints: [entrypoint],
    outdir,
    format: "esm",
  });
  if (!result.success) {
    for (const message of result.logs) console.error(message);
    throw new Error(`Cannot make ${entrypoint}`);
  }
}
async function makeServer(entrypoint: string, outdir: string) {
  const result = await Bun.build({
    ...opts,
    entrypoints: [entrypoint],
    outdir,
    format: "esm",
  });
  if (!result.success) {
    for (const message of result.logs) console.error(message);
    throw new Error(`Cannot make ${entrypoint}`);
  }
}

async function types() {
  const proc = Bun.spawn({
    cmd: [join(root, "node_modules/.bin/tsc"), "-p", "tsconfig.build.json"],
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) {
    throw new Error("Cannot make types");
  }
}

async function assertNoLeaks(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await assertNoLeaks(path);
      continue;
    }
    if (entry.name.endsWith(".map")) {
      throw new Error(`Found source map ${path}`);
    }
    if (entry.name.endsWith(".js") || entry.name.endsWith(".cjs")) {
      const contents = await Bun.file(path).text();
      if (contents.includes("sourceMappingURL")) {
        throw new Error(`Found sourceMappingURL ${path}`);
      }
    }
  }
}

await clean();
await makeServer(join(root, "src/server/index.ts"), join(dist, "server"));
await makeLib(join(root, "src/index.ts"), dist);
await types();
await assertNoLeaks(dist);
console.log("Built ylode");
