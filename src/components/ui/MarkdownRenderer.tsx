import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Clean & robust Markdown parser that transforms markdown syntax
 * (# H1, ## H2, ### H3, **bold**, *italic*, tables, bullet lists, quotes, code)
 * into rich, nicely styled typography.
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const renderFormattedText = (text: string) => {
    // Process bold (**text** or __text__), italic (*text* or _text_), code (`code`)
    const parts = text.split(/(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g);
    return parts.map((part, i) => {
      if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
        return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
        return <em key={i} className="italic text-foreground/90">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-primary border border-border">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const parseCells = (rowStr: string) => {
    return rowStr
      .split("|")
      .map(c => c.trim())
      .filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === ""));
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;
  let tableRows: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${keyPrefix}`} className="list-decimal list-inside space-y-1.5 my-3 pl-2 text-foreground/90">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${keyPrefix}`} className="list-disc list-inside space-y-1.5 my-3 pl-2 text-foreground/90">
            {listItems}
          </ul>
        );
      }
      listItems = [];
    }
  };

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length > 0) {
      // Remove delimiter rows like |---|---|
      const validRows = tableRows.filter(
        r => !/^\|?[\s:-]+(\|\s*[\s:-]+\s*)+\|?$/.test(r.trim()) && !/^\|?\s*:-+:?\s*(\|?\s*:-+:?\s*)*\|?$/.test(r.trim())
      );

      if (validRows.length > 0) {
        const headerCells = parseCells(validRows[0]);
        const bodyRows = validRows.slice(1).map(r => parseCells(r));

        elements.push(
          <div key={`table-${keyPrefix}`} className="my-5 overflow-x-auto border border-border rounded-xl shadow-xs bg-card">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-primary/10 text-primary border-b border-border font-semibold">
                <tr>
                  {headerCells.map((cell, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-display border-r last:border-r-0 border-border/40 font-bold">
                      {renderFormattedText(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/40 transition-colors odd:bg-background even:bg-muted/10">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 border-r last:border-r-0 border-border/30 text-foreground/90">
                        {renderFormattedText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableRows = [];
    }
  };

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  const flushCodeBlock = (keyPrefix: string) => {
    if (codeBlockLines.length > 0) {
      const codeString = codeBlockLines.join("\n");
      const lang = codeBlockLang || "code";

      elements.push(
        <div key={`code-${keyPrefix}`} className="my-5 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl text-slate-100">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400 select-none">
            <span className="font-bold uppercase tracking-wider text-purple-400">{lang}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(codeString);
              }}
              className="hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-purple-600 transition-colors"
            >
              Copy Code
            </button>
          </div>
          <pre className="p-4 overflow-x-auto font-mono text-xs md:text-sm leading-relaxed text-slate-200 selection:bg-purple-500 selection:text-white">
            <code>{codeString}</code>
          </pre>
        </div>
      );

      codeBlockLines = [];
      inCodeBlock = false;
      codeBlockLang = "";
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // 0. Check for Fenced Code Block (```lang or ```)
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock(`${idx}`);
      } else {
        flushList(`${idx}`);
        flushTable(`${idx}`);
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // 1. Check for Table Row (starts with | or contains | between text)
    if (trimmed.startsWith("|") && trimmed.includes("|")) {
      flushList(`${idx}`);
      tableRows.push(trimmed);
      return;
    }

    // If non-table line encountered, flush active table block
    flushTable(`${idx}`);

    // 2. Check for Headings
    if (trimmed.startsWith("# ")) {
      flushList(`${idx}`);
      elements.push(
        <h1 key={idx} className="text-2xl md:text-3xl font-display font-bold text-foreground border-b border-border pb-2.5 mt-6 mb-3 first:mt-0 tracking-tight">
          {renderFormattedText(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(`${idx}`);
      elements.push(
        <h2 key={idx} className="text-xl md:text-2xl font-display font-bold text-foreground mt-5 mb-2.5 tracking-tight">
          {renderFormattedText(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      flushList(`${idx}`);
      elements.push(
        <h3 key={idx} className="text-lg md:text-xl font-display font-semibold text-foreground mt-4 mb-2">
          {renderFormattedText(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith("#### ")) {
      flushList(`${idx}`);
      elements.push(
        <h4 key={idx} className="text-base font-semibold text-foreground mt-3 mb-1.5">
          {renderFormattedText(trimmed.slice(5))}
        </h4>
      );
    } 
    // 3. Check for Blockquote
    else if (trimmed.startsWith("> ")) {
      flushList(`${idx}`);
      elements.push(
        <blockquote key={idx} className="border-l-4 border-primary/80 bg-primary/5 pl-4 py-2 my-3 italic text-foreground/80 rounded-r-lg">
          {renderFormattedText(trimmed.slice(2))}
        </blockquote>
      );
    } 
    // 4. Check for Horizontal Divider
    else if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList(`${idx}`);
      elements.push(<hr key={idx} className="my-5 border-border" />);
    } 
    // 5. Check for Bullet List Item (- or *)
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(
        <li key={idx} className="leading-relaxed">
          {renderFormattedText(trimmed.slice(2))}
        </li>
      );
      isNumberedList = false;
    } 
    // 6. Check for Numbered List Item (1. 2. etc.)
    else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, "");
      listItems.push(
        <li key={idx} className="leading-relaxed">
          {renderFormattedText(text)}
        </li>
      );
      isNumberedList = true;
    } 
    // Empty Line
    else if (trimmed === "") {
      flushList(`${idx}`);
    } 
    // Regular Paragraph
    else {
      flushList(`${idx}`);
      elements.push(
        <p key={idx} className="leading-relaxed text-foreground/90 mb-3 last:mb-0">
          {renderFormattedText(trimmed)}
        </p>
      );
    }
  });

  flushCodeBlock("end");
  flushList("end");
  flushTable("end");

  return <div className={`prose-container ${className}`}>{elements}</div>;
}
