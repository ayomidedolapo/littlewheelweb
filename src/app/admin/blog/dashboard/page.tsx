// src/app/admin/blog/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@littlewheel/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@littlewheel/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@littlewheel/components/ui/alert-dialog";
import { Post } from "@littlewheel/types/posts";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";

const columns = [
  {
    key: "title",
    label: "Title",
    render: (post: Post) => post.title,
  },
  {
    key: "author",
    label: "Author",
    render: (post: Post) => post.author,
  },
  {
    key: "date",
    label: "Date",
    render: (post: Post) => post.date,
  },
];

export default function BlogDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/blog");
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setPosts(data);
    } catch {
      toast.error("Failed to load blog posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    try {
      const response = await fetch(`/api/blog/${selectedPost.slug}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete post");

      toast.success("Post deleted successfully");
      setPosts(posts.filter((post) => post.slug !== selectedPost.slug));
      setSelectedPost(null);
    } catch {
      toast.error("Failed to delete post");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        <Button
          onClick={() => router.push("/admin/blog")}
          className="bg-black text-white hover:bg-[#474747]"
        >
          Create New Post
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-64px)] pb-10">
        {loading ? (
          <div className="flex justify-center py-10">
            <p>Loading...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f9fafb]">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-[#6b7280] text-xs uppercase font-medium tracking-wider"
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-[#6b7280] text-xs uppercase font-medium tracking-wider text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.slug}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className="text-[#111827]">
                        {col.render(post)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-[#2563eb] hover:text-[#1e40af]"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/blog/edit/${post.slug}`}
                          className="text-[#4f46e5] hover:text-[#3730a3]"
                        >
                          Edit
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={() => setSelectedPost(post)}
                              className="text-[#D42620] hover:underline"
                            >
                              Delete
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the blog post.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-[#D42620] text-white hover:bg-[#ad1e1a]"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10 bg-[#ffffff] rounded-lg shadow">
            <p className="text-[#6b7280]">No blog posts found</p>
            <p className="mt-2 text-sm text-[#9ca3af]">
              Create your first blog post to get started
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
