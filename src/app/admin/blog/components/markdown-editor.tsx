//src/app/admin/blog/components/markdown-editor.tsx
"use client";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@littlewheel/components/ui/tabs";
import { Textarea } from "@littlewheel/components/ui/textarea";
import { cn } from "@littlewheel/lib/utils";
import { marked } from "marked";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

const tabDefinitions = [
  {
    value: "write",
    label: "Write",
    content: ({ value, onChange, rows }: MarkdownEditorProps) => (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="font-mono border-0 resize-none focus-visible:ring-0"
        placeholder="Write your content in markdown..."
      />
    ),
  },
  {
    value: "preview",
    label: "Preview",
    content: ({ value }: MarkdownEditorProps) => (
      <div
        className="blog-content min-h-[200px]"
        dangerouslySetInnerHTML={{ __html: marked(value) }}
      />
    ),
  },
];

export default function MarkdownEditor({
  value,
  onChange,
  rows = 15,
}: MarkdownEditorProps) {
  return (
    <div className="border rounded-md">
      <Tabs defaultValue="write" className="w-full">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <TabsList className="grid grid-cols-2 w-48">
            {tabDefinitions.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-black data-[state=active]:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="text-xs text-[#6B7280] py-2">Markdown supported</div>
        </div>

        {tabDefinitions.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={cn(tab.value === "preview" ? "p-4" : "p-0")}
          >
            {tab.content({ value, onChange, rows })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
