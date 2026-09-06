import chalk from "chalk"

export const log = {
  success: (message: string) => console.log(`${chalk.bold.green("✓")} ${message}`),
  info: (message: string) => console.log(`${chalk.bold.cyan("ℹ")} ${message}`),
  err: (message: string) => console.log(`${chalk.bold.red("✗")} ${message}`),
}

export const ready = (t: number) => {
  log.success(`Ready in ${Math.round(performance.now() - t)}ms`);
};
