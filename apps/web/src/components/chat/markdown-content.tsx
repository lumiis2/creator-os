"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

function normalizeLooseMarkdown(input: string): string {
  return input
    .replace(/\*\*\s+([^*\n][\s\S]*?[^*\n])\s+\*\*/g, "**$1**")
    .replace(/__\s+([^_\n][\s\S]*?[^_\n])\s+__/g, "__$1__");
}

const markdownComponents: Components = {
  p: ({ ...props }) => <p {...props} className="my-2 leading-7 text-slate-100" />,
  strong: ({ ...props }) => <strong {...props} className="font-semibold text-white" />,
  em: ({ ...props }) => <em {...props} className="italic text-slate-100" />,
  h1: ({ ...props }) => <h1 {...props} className="mb-3 mt-4 text-2xl font-bold text-white" />,
  h2: ({ ...props }) => <h2 {...props} className="mb-2 mt-4 text-xl font-semibold text-white" />,
  h3: ({ ...props }) => <h3 {...props} className="mb-2 mt-3 text-lg font-semibold text-white" />,
  ul: ({ ...props }) => <ul {...props} className="my-2 list-disc space-y-1 pl-5" />,
  ol: ({ ...props }) => <ol {...props} className="my-2 list-decimal space-y-1 pl-5" />,
  li: ({ ...props }) => <li {...props} className="leading-7 text-slate-100" />,
  blockquote: ({ ...props }) => (
    <blockquote
      {...props}
      className="my-3 border-l-4 border-blue-400/70 bg-blue-500/10 px-3 py-2 text-slate-200"
    />
  ),
  hr: ({ ...props }) => <hr {...props} className="my-4 border-border" />,
  a: ({ ...props }) => (
    <a
      {...props}
      className="text-blue-300 underline decoration-blue-300/70 underline-offset-2 hover:text-blue-200"
      target="_blank"
      rel="noreferrer"
    />
  ),
  table: ({ ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table {...props} className="min-w-full border-collapse text-left text-sm" />
    </div>
  ),
  th: ({ ...props }) => <th {...props} className="border-b border-border bg-background px-3 py-2 font-semibold text-slate-100" />,
  td: ({ ...props }) => <td {...props} className="border-b border-border/70 px-3 py-2 text-slate-200" />,
  code: (props) => {
    const { className, children, ...rest } = props as any;
    const inline = Boolean((props as any).inline);
    if (inline) {
      return (
        <code
          {...rest}
          className="rounded bg-background px-1.5 py-0.5 font-mono text-[0.92em] text-blue-200"
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="my-3 overflow-x-auto rounded-xl border border-border bg-[#0a0f1d] p-3">
        <code {...rest} className={className ? `${className} font-mono text-sm text-slate-100` : "font-mono text-sm text-slate-100"}>
          {children}
        </code>
      </pre>
    );
  },
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  const normalized = normalizeLooseMarkdown(content);

  return (
    <div className="chat-markdown max-w-none text-[15px] leading-7 text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
