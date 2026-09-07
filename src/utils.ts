import { stat } from "node:fs/promises";
import chalk from "chalk";

export type TreeEntry = { label: string; file: string };
export type TreeSection = { title: string; entries: TreeEntry[] };

export function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
async function sizeOf(file: string): Promise<number> {
  return (await stat(file).catch(() => ({ size: 0 }))).size;
}

export async function makeTrees(sections: TreeSection[]) {
  const nonEmpty = sections.filter((section) => section.entries.length > 0);
  if (!nonEmpty.length) return;
  const sized = await Promise.all(
    nonEmpty.map((section) =>
      Promise.all(
        section.entries
          .slice()
          .sort((a, b) => a.label.localeCompare(b.label))
          .map(async (entry) => ({
            label: entry.label,
            size: await sizeOf(entry.file),
          })),
      ),
    ),
  );
  const width = Math.max(...sized.flat().map((entry) => entry.label.length));
  nonEmpty.forEach((section, i) => {
    const entries = sized[i];
    console.log(chalk.bold(section.title));
    entries.forEach((entry, j) => {
      const branch = j === entries.length - 1 ? "\u2514\u2500" : "\u251c\u2500";
      const s = chalk.dim(size(entry.size).padStart(8));
      console.log(`${branch} ${entry.label.padEnd(width + 2)}${s}`);
    });
  });
}
