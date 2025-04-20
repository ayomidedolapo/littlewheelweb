// src/app/admin/blog/page.tsx
"use client";
import { useState } from "react";
import { Button } from "@littlewheel/components/ui/button";
import { Input } from "@littlewheel/components/ui/input";
import { Textarea } from "@littlewheel/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@littlewheel/components/ui/label";
import MarkdownHelp from "./components/markdown-helper";
import MarkdownEditor from "./components/markdown-editor";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";

export default function AdminBlogPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    author: "",
    content: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create blog post");
      }

      const data = await response.json();
      toast.success("Blog post created successfully");
      router.push(`/blog/${data.slug}`);
    } catch {
      toast.error("Failed to create blog post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertTemplate = () => {
    const template = `# Sample Blog Post Title
  
  This is an introduction paragraph that provides an overview of what this post will cover.
  
  ## Section 1: Getting Started
  
  This is the first section of content. Here's a simple list of items:
  
  - First item in an unordered list
  - Second item with **bold text**
  - Third item with *italic text*
  
  ## Section 2: Advanced Features
  
  This section shows how to use numbered lists:
  
  1. First step in the process
  2. Second step with more detail
     - A nested bullet point
     - Another nested bullet point
       - Even deeper nesting works too
       - With proper indentation
  3. Third step to complete the process
  
  ## Section 3: Key Takeaways
  
  Here are the main points to remember:
  
  - Important point one
    - Supporting detail
    - Another supporting detail
  - Important point two
  - Important point three
  
  ## Conclusion
  
  This is the summary paragraph that wraps up the post.`;

    setFormData((prev) => ({ ...prev, content: template }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Create New Blog Post</h1>
      <ScrollArea className="h-[calc(100vh-64px)] pb-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="excerpt" className="block text-sm font-medium mb-1">
              Excerpt
            </Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              required
              className="w-full"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="author" className="block text-sm font-medium mb-1">
              Author
            </Label>
            <Input
              id="author"
              name="author"
              value={formData.author}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="content" className="block text-sm font-medium mb-1">
              Content (Markdown supported)
            </Label>
            <MarkdownEditor
              value={formData.content}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, content: value }))
              }
              rows={15}
            />
            <Button
              type="button"
              variant="outline"
              onClick={insertTemplate}
              className="text-sm m-2"
            >
              Insert Template
            </Button>
            <MarkdownHelp />
          </div>

          <Button
            type="submit"
            className="bg-black text-white hover:bg-[#474747]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Post"}
          </Button>
        </form>
      </ScrollArea>
    </div>
  );
}
