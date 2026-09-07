import chalk from "chalk";

export function reqlog(
  request: Request,
  pathname: string,
  status: number,
  started: number,
) {
  const duration = performance.now() - started;
  const method = chalk.dim(request.method);
  const path = chalk.white(pathname);
  const statusText =
    status >= 500
      ? chalk.red(status)
      : status >= 400
        ? chalk.yellow(status)
        : status >= 300
          ? chalk.cyan(status)
          : chalk.green(status);
  const time =
    duration < 1
      ? chalk.dim(`${duration.toFixed(2)}ms`)
      : duration >= 100
        ? chalk.yellow(`${Math.round(duration)}ms`)
        : chalk.dim(`${Math.round(duration)}ms`);
  console.log(`${method} ${path} ${statusText} took ${time}`);
}
