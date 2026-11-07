// Reads the agent skills from ../../skills/*/SKILL.md at build time, so the catalogue never drifts from them.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface Skill {
  name: string;
  description: string;
  files: string[];
}

declare const data: Skill[];
export { data };

export default {
  watch: ["../../skills/*/SKILL.md"],
  load(watched: string[]): Skill[] {
    return watched
      .map((file) => {
        const { data } = matter(fs.readFileSync(file, "utf8"));
        const dir = path.dirname(file);
        const files = fs
          .readdirSync(dir, { recursive: true, withFileTypes: true })
          .filter((d) => d.isFile())
          .map((d) => path.relative(dir, path.join(d.parentPath ?? (d as any).path, d.name)))
          .sort();
        return { name: String(data.name), description: String(data.description).trim(), files };
      })
      .sort((a, b) => (a.name === "encore-new-reimplementation" ? -1 : b.name === "encore-new-reimplementation" ? 1 : a.name.localeCompare(b.name)));
  },
};
