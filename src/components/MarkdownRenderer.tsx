import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "../utils"

interface MarkdownRendererProps {
  content: string
  role?: "user" | "assistant"
  className?: string
}

export function MarkdownRenderer({
  content,
  role = "assistant",
  className,
}: MarkdownRendererProps) {
  const isUser = role === "user"

  return (
    <div
      className={cn(
        "text-sm leading-relaxed break-words space-y-2.5",
        isUser ? "text-navy-dark" : "text-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong
              className={cn(
                "font-semibold",
                isUser ? "text-navy-dark" : "text-navy",
              )}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h1
              className={cn(
                "font-heading font-bold text-base mt-3 mb-1.5 first:mt-0",
                isUser ? "text-navy-dark" : "text-navy",
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                "font-heading font-bold text-sm mt-2.5 mb-1 first:mt-0",
                isUser ? "text-navy-dark" : "text-navy",
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                "font-heading font-semibold text-xs mt-2 mb-1 first:mt-0 uppercase tracking-wider",
                isUser ? "text-navy-dark" : "text-navy-light",
              )}
            >
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 my-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 my-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "border-l-2 pl-3 py-1 my-2 text-xs italic rounded-r",
                isUser
                  ? "border-navy-dark/40 bg-navy-dark/5 text-navy-dark"
                  : "border-gold bg-gold/5 text-muted",
              )}
            >
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline =
              !codeClassName &&
              typeof children === "string" &&
              !children.includes("\n")
            if (isInline) {
              return (
                <code
                  className={cn(
                    "font-mono text-[12px] px-1.5 py-0.5 rounded",
                    isUser
                      ? "bg-navy-dark/15 text-navy-dark"
                      : "bg-navy/10 text-navy font-medium",
                  )}
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre
                className={cn(
                  "p-3 rounded-lg overflow-x-auto font-mono text-xs my-2",
                  isUser
                    ? "bg-navy-dark text-teal-light"
                    : "bg-navy-dark text-white border border-border/20",
                )}
              >
                <code {...props}>{children}</code>
              </pre>
            )
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead
              className={cn(
                isUser
                  ? "bg-navy-dark/10"
                  : "bg-navy/5 text-navy font-semibold",
              )}
            >
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border bg-surface/50">
              {children}
            </tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-1.5 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 text-left">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline underline-offset-2 transition-colors",
                isUser
                  ? "text-navy-dark font-medium hover:text-black"
                  : "text-navy-light hover:text-navy font-medium",
              )}
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr
              className={cn(
                "my-2.5 border-t",
                isUser ? "border-navy-dark/20" : "border-border",
              )}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
export default MarkdownRenderer
