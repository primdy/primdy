#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { log } from "../logger";

const platform = process.platform;
const arch = process.arch;
const require = createRequire(import.meta.url);
const report = process.report?.getReport();
const header = report && "header" in report ? report.header : undefined;
const glibcVersion =
  header && typeof header === "object" && "glibcVersionRuntime" in header
    ? header.glibcVersionRuntime
    : undefined;

if (platform === "linux" && !glibcVersion) {
  log.err("Primdy requires glibc");
  process.exit(1);
}

const packageName = `@primdy/${platform}-${arch}`;
const binaryName = `primdy-server${platform === "win32" ? ".exe" : ""}`;
const localBinary = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../.release",
  `server-${platform}-${arch}`,
  binaryName,
);
let binary: string;
try {
  binary = require.resolve(packageName);
} catch {
  if (existsSync(localBinary)) {
    binary = localBinary;
  } else {
    log.err(`Primdy is not supported on ${platform}-${arch}`);
    process.exit(1);
  }
}

const child = spawn(binary, process.argv.slice(2), { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  log.err(`Fatal error, couldn't start Primdy server! ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
