import fs from "fs";
import path from "path";

const BLOG_DIRS = [
  path.join(process.cwd(), "src/app/blog"),
  path.join(process.cwd(), "src/blog"),
];

function resolveBlogDir() {
  for (const d of BLOG_DIRS) if (fs.existsSync(d)) return d;
  return null;
}

export function getBlogPosts() {
  const dir = resolveBlogDir();
  if (!dir) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => path.join(dir, f));
}
