import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post } from "@littlewheel/types/posts";

// Update this path to match your actual directory structure
const postsDir = path.join(process.cwd(), "src", "blog");

export default function getAllPosts(): Post[] {
  // Check if directory exists, if not return empty array
  if (!fs.existsSync(postsDir)) {
    console.warn(`Blog directory not found: ${postsDir}`);
    return [];
  }

  const fileNames = fs.readdirSync(postsDir);

  // If no files found, return empty array
  if (fileNames.length === 0) {
    return [];
  }

  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const filePath = path.join(postsDir, fileName);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);

      return {
        slug,
        content,
        title: data.title || "",
        excerpt: data.excerpt || "",
        date: data.date || "",
        author: data.author || "",
        ...data,
      } as Post;
    });
}
