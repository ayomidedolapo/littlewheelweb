import getAllPosts from "@littlewheel/lib/posts";
import Link from "next/link";
import { Post } from "@littlewheel/types/posts";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import BlogHeader from "./components/blog-header";
import BlogFooter from "./components/blog-footer";
import Waitlist from "../home/waitlist";

export default function Blog() {
  const posts: Post[] = getAllPosts();

  return (
    <div className="h-screen flex flex-col">
      <BlogHeader />
      <ScrollArea className="h-[calc(100vh-64px)]">
        <main className="h-full flex flex-col items-center py-16 px-4">
          <h1 className="text-4xl font-bold mb-8">Blog</h1>

          {posts.length > 0 ? (
            <ul className="w-full max-w-3xl space-y-6">
              {posts.map((post) => (
                <li key={post.slug} className="border-b pb-4">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-xl font-semibold text-blue-600 hover:underline"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{post.date}</p>
                  {post.excerpt && (
                    <p className="mt-2 text-gray-700">{post.excerpt}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <p className="text-xl text-gray-600">No blog posts found</p>
              <p className="mt-4">Check back soon for new content!</p>
            </div>
          )}
        </main>
        <Waitlist />
        <BlogFooter />
      </ScrollArea>
    </div>
  );
}
