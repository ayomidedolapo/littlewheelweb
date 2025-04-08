// src/app/blog/[slug]/page.tsx
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { PostWithHTML } from "@littlewheel/types/posts";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import BlogFooter from "../components/blog-footer";
import BlogHeader from "../components/blog-header";
import Waitlist from "@littlewheel/app/landing/waitlist";

// Helper function to get post data
async function getPostData(slug: string): Promise<PostWithHTML | null> {
  const postsDir = path.join(process.cwd(), "src", "blog");
  const filePath = path.join(postsDir, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  const htmlContent = marked(content);

  return {
    slug,
    htmlContent,
    title: data.title || "",
    excerpt: data.excerpt || "",
    date: data.date || "",
    author: data.author || "",
    ...data,
  } as PostWithHTML;
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const postsDir = path.join(process.cwd(), "src", "blog");

  if (!fs.existsSync(postsDir)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDir);

  return fileNames
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => ({
      slug: fileName.replace(/\.md$/, ""),
    }));
}

// Fix: Remove Promise type from params
export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostData(params.slug);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <BlogHeader />
        <main className="flex-grow flex flex-col items-center justify-center py-16 px-4">
          <h1 className="text-4xl font-bold mb-8">Post Not Found</h1>
          <p>
            Sorry, the blog post you&apos;re looking for doesn&apos;t exist.
          </p>
        </main>
        <Waitlist />
        <BlogFooter />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <BlogHeader />
      <ScrollArea className="h-[calc(100vh-64px)]">
        <main className="h-full flex flex-col items-center py-16 px-4">
          <article className="prose prose-lg max-w-3xl space-y-6">
            <div className="flex flex-col text-center items-center justify-center space-y-6">
              <h1 className="text-4xl font-bold">{post.title}</h1>
              <p className="text-[#344054]">{post.excerpt}</p>
              <div className="flex flex-col md:flex-row w-1/2 items-center justify-center gap-6 text-sm">
                <p className="text-[#0D5EBA]">{post.date}</p>
                <p className="text-[#344054]">{post.author}</p>
              </div>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: post.htmlContent }}
              className="blog-content"
            />
          </article>
        </main>
        <Waitlist />
        <BlogFooter />
      </ScrollArea>
    </div>
  );
}
