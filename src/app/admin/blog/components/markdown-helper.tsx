//src/app/admin/blog/components/markdown-help.tsx
export default function MarkdownHelp() {
  return (
    <div className="bg-[#F9FAFB] p-4 rounded-md mt-2 text-sm">
      <h4 className="font-semibold mb-2">Markdown Formatting Tips:</h4>
      <ul className="space-y-1 list-disc pl-5">
        <li>
          <code># Heading 1</code> - For main headings
        </li>
        <li>
          <code>## Heading 2</code> - For section headings
        </li>
        <li>
          <code>**Bold Text**</code> - For <strong>bold text</strong>
        </li>
        <li>
          <code>*Italic Text*</code> - For <em>italic text</em>
        </li>
        <li>
          <code>[Link Text](URL)</code> - For hyperlinks
        </li>
        <li>
          <code>- Item</code> or <code>* Item</code> - For bullet lists
        </li>
        <li>
          <code>1. Item</code> - For numbered lists
        </li>
        <li>
          Indent lists with spaces for nested items:
          <pre className="bg-[#F3F4F6] p-1 mt-1 rounded">
            {`- Parent item
    - Child item
      - Grandchild item`}
          </pre>
        </li>
      </ul>
    </div>
  );
}
