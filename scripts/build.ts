#!/usr/bin/env bun

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pkg from "../package.json";

if (typeof Bun === "undefined") {
  console.log("Primdy cannot be built without Bun");
  process.exit(1);
}

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const runplat =
  process.platform === "win32"
    ? "windows"
    : process.platform === "darwin"
      ? "darwin"
      : "linux";
const target = process.env.PRIMDY_TARGET ?? `bun-${runplat}-${process.arch}`;
const targets = {
  "bun-linux-x64": { suffix: "linux-x64", os: "linux", cpu: "x64" },
  "bun-linux-arm64": { suffix: "linux-arm64", os: "linux", cpu: "arm64" },
  "bun-darwin-x64": { suffix: "darwin-x64", os: "darwin", cpu: "x64" },
  "bun-darwin-arm64": { suffix: "darwin-arm64", os: "darwin", cpu: "arm64" },
  "bun-windows-x64": { suffix: "win32-x64", os: "win32", cpu: "x64" },
} as const;

function isTarget(value: string): value is keyof typeof targets {
  return Object.prototype.hasOwnProperty.call(targets, value);
}
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
async function makeBinary(entrypoint: string) {
  if (!isTarget(target)) throw new Error(`Unsupported target ${target}`);
  const platform = targets[target];
  const packageDir = join(root, ".release", `server-${platform.suffix}`);
  const binary = `primdy-server${platform.os === "win32" ? ".exe" : ""}`;
  await rm(packageDir, { recursive: true, force: true });
  await mkdir(packageDir, { recursive: true });
  const result = await Bun.build({
    ...opts,
    entrypoints: [entrypoint],
    compile: { target, outfile: join(packageDir, binary) },
  });
  if (!result.success) {
    for (const message of result.logs) console.error(message);
    throw new Error(`Cannot compile ${target}`);
  }
  await writeFile(
    join(packageDir, "package.json"),
    JSON.stringify({
      name: `@primdy/${platform.suffix}`,
      version: pkg.version,
      repository: pkg.repository,
      os: [platform.os],
      cpu: [platform.cpu],
      bin: { "primdy-server": `./${binary}` },
      main: `./${binary}`,
      files: [binary],
    }),
  );
}
async function makePkg(entrypoint: string, outdir: string) {
  const result = await Bun.build({
    ...opts,
    entrypoints: [entrypoint],
    outdir,
    target: "node",
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
await makePkg(join(root, "src/server/spawn.ts"), join(dist, "server"));
await makeLib(join(root, "src/index.ts"), dist);
await makeBinary(join(root, "src/server/index.ts"));
await types();
await assertNoLeaks(dist);
console.log("Built primdy");
