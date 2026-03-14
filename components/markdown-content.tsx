"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-6 text-base font-semibold text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {children}
          </h3>
        ),
        p: ({ children }) => <p>{children}</p>,
        ul: ({ children }) => (
          <ul className="list-inside list-disc space-y-1 pl-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-inside list-decimal space-y-2 pl-2">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b text-left text-foreground">
            {children}
          </thead>
        ),
        th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
        td: ({ children }) => (
          <td className="border-b border-muted px-3 py-2">{children}</td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-foreground"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="border-muted" />,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
