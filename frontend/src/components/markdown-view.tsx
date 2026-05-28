"use client";

import React from "react";

export function MarkdownView({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="py-12 text-center text-stone-400">
        <p className="italic">Section not yet generated.</p>
      </div>
    );
  }

  const isArabicHeavy =
    (content.match(/[؀-ۿ]/g)?.length ?? 0) > content.length * 0.3;

  const elements: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Code blocks (typically the pricing JSON)
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3);
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const codeContent = codeLines.join("\n");

      if (lang === "json") {
        elements.push(
          <details key={key++} className="my-6 group">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-700 inline-flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Structured pricing data
            </summary>
            <pre className="mt-3 bg-stone-50 ring-1 ring-stone-200/60 p-4 rounded-lg text-xs font-mono overflow-x-auto text-stone-700">
              <code>{codeContent}</code>
            </pre>
          </details>
        );
      } else {
        elements.push(
          <pre
            key={key++}
            className="bg-stone-50 ring-1 ring-stone-200/60 p-4 rounded-lg text-sm font-mono overflow-x-auto text-stone-800 my-4"
          >
            <code>{codeContent}</code>
          </pre>
        );
      }
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="text-base font-semibold text-stone-900 mt-6 mb-2 tracking-tight"
        >
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      const heading = line.slice(3);
      const sectionNum = heading.match(/^(\d+\.?\d*)/)?.[1];
      elements.push(
        <div key={key++} className="mt-10 mb-4 flex items-baseline gap-3 border-b border-stone-200 pb-2">
          {sectionNum && (
            <span className="text-xs font-mono font-medium text-emerald-700 tabular-nums tracking-wider">
              §{sectionNum}
            </span>
          )}
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {renderInline(sectionNum ? heading.replace(/^\d+\.?\d*\s*/, "") : heading)}
          </h2>
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={key++}
          className="text-2xl font-bold text-stone-900 mt-8 mb-4 tracking-tight"
        >
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())
    ) {
      // Markdown table
      const tableLines: string[] = [line];
      i++; // skip header
      i++; // skip separator
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(renderTable(tableLines, key++));
      continue;
    } else if (line.trim().startsWith("> ")) {
      // Blockquote / callout
      const quoteLines: string[] = [line.trim().slice(2)];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          className="my-4 pl-4 border-l-4 border-emerald-300 bg-emerald-50/40 py-3 pr-4 rounded-r-lg text-stone-700 italic"
        >
          {quoteLines.map((q, idx) => (
            <p key={idx} className="leading-relaxed">
              {renderInline(q)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("- ") || lines[i].startsWith("* "))
      ) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-3 space-y-1.5 list-disc list-inside text-stone-700 leading-relaxed">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-3 space-y-1.5 list-decimal list-inside text-stone-700 leading-relaxed">
          {items.map((it, idx) => (
            <li key={idx} className="pl-1">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
      continue;
    } else {
      elements.push(
        <p
          key={key++}
          className="text-stone-700 leading-relaxed my-3 text-[15px]"
        >
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return (
    <div
      dir={isArabicHeavy ? "rtl" : "ltr"}
      className={isArabicHeavy ? "text-right" : ""}
    >
      {elements}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // matches: **bold**, *italic*, `code`
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(
        <strong key={key++} className="font-semibold text-stone-900">
          {match[1]}
        </strong>
      );
    } else if (match[2]) {
      parts.push(
        <em key={key++} className="italic">
          {match[2]}
        </em>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 text-[0.85em] font-mono"
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

function renderTable(lines: string[], key: number) {
  const rows = lines
    .map((l) =>
      l
        .trim()
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
    );

  if (rows.length === 0) return null;

  const [header, ...body] = rows;
  return (
    <div
      key={key}
      className="my-6 overflow-x-auto rounded-xl ring-1 ring-stone-200/80 shadow-sm"
    >
      <table className="w-full text-sm">
        <thead className="bg-stone-50">
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="text-left px-4 py-2.5 font-semibold text-stone-700 text-xs uppercase tracking-wider border-b border-stone-200"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {body.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-stone-50/40 transition-colors"
            >
              {row.map((c, j) => (
                <td
                  key={j}
                  className="px-4 py-2.5 text-stone-700 align-top"
                >
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Extract the section headings from a markdown string for the outline sidebar. */
export function extractOutline(content: string): { id: string; text: string; level: number }[] {
  const outline: { id: string; text: string; level: number }[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      outline.push({
        id: text.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-"),
        text,
        level: 2,
      });
    } else if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      outline.push({
        id: text.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-"),
        text,
        level: 3,
      });
    }
  }

  return outline;
}
