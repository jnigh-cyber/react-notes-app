import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Preview({ body }) {
  if (!body.trim()) {
    return (
      <div
        data-testid="preview"
        className="p-6 text-sm italic text-slate-400 dark:text-slate-600"
      >
        Nothing to preview yet.
      </div>
    );
  }

  return (
    <div
      data-testid="preview"
      className="prose prose-slate max-w-none p-6 prose-headings:font-semibold prose-pre:bg-slate-100 dark:prose-invert dark:prose-pre:bg-slate-800"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
