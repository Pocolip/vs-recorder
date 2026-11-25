import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";
import { blocks, type Block } from "../../utils/markdown";

/**
 * Renders the small subset of Markdown the site's own text uses (the Terms and Privacy
 * pages, from src/content/, and announcements): # to ### headings, paragraphs, "- " lists,
 * **bold**, _italic_ and [links](url). Links starting with "/" stay in the app; others
 * open in a new tab. Only for trusted, checked-in text: anything else is shown as is.
 */
export default function Markdown({ source }: { source: string }) {
  return <div className="space-y-4">{blocks(source).map(renderBlock)}</div>;
}

function renderBlock(block: Block, index: number) {
  switch (block.kind) {
    case "heading":
      if (block.level === 1) {
        return (
          <h1 key={index} className="text-3xl font-bold text-gray-800 dark:text-white/90">
            {inline(block.text)}
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2 key={index} className="pt-4 text-xl font-semibold text-gray-800 dark:text-white/90">
            {inline(block.text)}
          </h2>
        );
      }
      return (
        <h3 key={index} className="pt-2 font-semibold text-gray-800 dark:text-white/90">
          {inline(block.text)}
        </h3>
      );
    case "list":
      return (
        <ul key={index} className="list-disc space-y-1.5 pl-5 text-gray-600 dark:text-gray-300">
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      );
    case "paragraph":
      return (
        <p key={index} className="text-gray-600 dark:text-gray-300">
          {inline(block.text)}
        </p>
      );
  }
}

/** One line of Markdown without blocks: **bold**, _italic_ and [links](url). */
export function MarkdownInline({ text }: { text: string }) {
  return <>{inline(text)}</>;
}

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w])_(.+?)_(?![\w])/g;

const linkClass = "text-brand-500 underline-offset-2 hover:underline dark:text-brand-400";

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const [, bold, label, href, italic] = match;
    if (bold != null) {
      parts.push(
        <strong key={at} className="font-semibold text-gray-800 dark:text-white/90">
          {inline(bold)}
        </strong>,
      );
    } else if (label != null && href != null) {
      parts.push(link(at, label, href));
    } else if (italic != null) {
      parts.push(<em key={at}>{inline(italic)}</em>);
    }
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <Fragment>{parts}</Fragment>;
}

function link(key: number, label: string, href: string) {
  if (href.startsWith("/")) {
    return (
      <Link key={key} to={href} className={linkClass}>
        {label}
      </Link>
    );
  }
  if (!/^https?:\/\//.test(href)) return label;
  return (
    <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {label}
    </a>
  );
}
