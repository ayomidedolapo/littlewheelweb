// src/types/post.ts
export interface PostMetadata {
  title: string;
  excerpt?: string;
  date: string;
  author: string;
  content: string;
  tags?: string[];
  [key: string]: unknown; // For any additional frontmatter properties
}

export interface Post extends PostMetadata {
  slug: string;
  content: string;
}

export interface PostWithHTML extends PostMetadata {
  slug: string;
  htmlContent: string;
}
