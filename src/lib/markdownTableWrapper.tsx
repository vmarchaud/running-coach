import { Children, isValidElement, ReactElement, ReactNode } from "react";

// A chat bubble/notes card is narrow — even with typeset's .typeset-scroll
// wrapper, a real <table> either shrinks its cells to an unreadable wrap or
// forces horizontal scrolling that cuts off columns (both reported as hard to
// read). Instead of rendering an actual <table>, this pulls the parsed
// thead/tbody structure apart and re-renders each row as a small stacked
// card: first cell as a title, remaining cells as "header: value" lines. No
// horizontal scroll, nothing cut off, at any container width.
function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children);
  return "";
}

function childrenOf(el: ReactElement): ReactElement[] {
  return Children.toArray((el.props as { children?: ReactNode }).children).filter(isValidElement) as ReactElement[];
}

function MarkdownTable({ children }: { children?: ReactNode }) {
  const sections = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const thead = sections.find((el) => el.type === "thead");
  const tbody = sections.find((el) => el.type === "tbody");

  if (!thead || !tbody) return null; // malformed table, nothing sensible to render

  const headerRow = childrenOf(thead)[0];
  const headers = headerRow ? childrenOf(headerRow).map((th) => extractText(th).trim()) : [];
  const bodyRows = childrenOf(tbody);

  return (
    <div className="flex flex-col gap-2 my-3 not-prose">
      {bodyRows.map((row, i) => {
        const cells = childrenOf(row).map((td) => extractText(td).trim());
        return (
          <div key={i} className="rounded-lg border border-neutral-700 overflow-hidden text-sm">
            {cells[0] && <div className="px-3 py-2 font-semibold bg-neutral-800/60">{cells[0]}</div>}
            {cells.slice(1).map((cell, j) => (
              <div
                key={j}
                className="flex items-center justify-between gap-3 px-3 py-1.5 border-t border-neutral-800"
              >
                <span className="text-neutral-500">{headers[j + 1] ?? ""}</span>
                <span className="text-right">{cell || "—"}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export const markdownTableWrapper = {
  table: MarkdownTable,
};
