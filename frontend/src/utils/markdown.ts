/** Splits the site's Markdown documents into blocks for components/common/Markdown. */
export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

export function blocks(source: string): Block[] {
  const out: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (paragraph.length > 0) out.push({ kind: "paragraph", text: paragraph.join(" ") });
    if (list) out.push({ kind: "list", items: list });
    paragraph = [];
    list = null;
  };

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (line === "") {
      flush();
    } else if (heading) {
      flush();
      out.push({ kind: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (line.startsWith("- ")) {
      if (paragraph.length > 0) flush();
      list ??= [];
      list.push(line.slice(2));
    } else if (list) {
      // A wrapped list item
      list[list.length - 1] += ` ${line}`;
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return out;
}
