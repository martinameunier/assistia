import React, {
  type ReactNode
} from "react";

import {
  linkifyText
} from "./LinkifiedText";
import {
  openExternalUrl
} from "../services/tauris";

type MarkdownBlock =
  | {
      type: "code";
      content: string;
    }
  | {
      type: "heading";
      level: 2 | 3 | 4;
      content: string;
    }
  | {
      type: "ordered-list" | "unordered-list";
      items: string[];
    }
  | {
      type: "paragraph";
      content: string;
    }
  | {
      type: "quote";
      content: string;
    };

const markdownLinkPattern =
  /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;

function openLinkInBrowser(
  event: React.MouseEvent<HTMLAnchorElement>,
  url: string
) {
  event.preventDefault();

  openExternalUrl(url)
    .catch(() => {
      window.open(url, "_blank", "noreferrer");
    });
}

function renderTextWithLinks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(markdownLinkPattern)) {
    const label =
      match[1];
    const url =
      match[2];
    const index =
      match.index ?? 0;

    if (index > lastIndex) {
      nodes.push(...linkifyText(text.slice(lastIndex, index)));
    }

    nodes.push(
      <a
        key={`${url}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => openLinkInBrowser(event, url)}
      >
        {label}
      </a>
    );

    lastIndex =
      index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...linkifyText(text.slice(lastIndex)));
  }

  return nodes;
}

function renderInline(text: string): ReactNode[] {

  const parts =
    text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts
    .filter((part) => part !== "")
    .map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index}>
            {part.slice(1, -1)}
          </code>
        );
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index}>
            {renderTextWithLinks(part.slice(2, -2))}
          </strong>
        );
      }

      return (
        <React.Fragment key={index}>
          {renderTextWithLinks(part)}
        </React.Fragment>
      );
    });
}

function parseMarkdown(markdown: string): MarkdownBlock[] {

  const blocks: MarkdownBlock[] = [];
  const lines =
    markdown.replace(/\r\n/g, "\n").split("\n");

  let paragraphLines: string[] = [];
  let listType: "ordered-list" | "unordered-list" | null = null;
  let listItems: string[] = [];
  let codeLines: string[] | null = null;

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" ")
    });
    paragraphLines = [];
  }

  function flushList() {
    if (listType === null || listItems.length === 0) {
      return;
    }

    blocks.push({
      type: listType,
      items: listItems
    });
    listType = null;
    listItems = [];
  }

  for (const line of lines) {
    const trimmedLine =
      line.trim();

    if (codeLines !== null) {
      if (trimmedLine.startsWith("```")) {
        blocks.push({
          type: "code",
          content: codeLines.join("\n")
        });
        codeLines = null;
      } else {
        codeLines.push(line);
      }

      continue;
    }

    if (trimmedLine.startsWith("```")) {
      flushParagraph();
      flushList();
      codeLines = [];
      continue;
    }

    if (trimmedLine === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch =
      trimmedLine.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: (headingMatch[1].length + 1) as 2 | 3 | 4,
        content: headingMatch[2]
      });
      continue;
    }

    const unorderedListMatch =
      trimmedLine.match(/^[-*]\s+(.+)$/);

    if (unorderedListMatch) {
      flushParagraph();

      if (listType !== "unordered-list") {
        flushList();
        listType = "unordered-list";
      }

      listItems.push(unorderedListMatch[1]);
      continue;
    }

    const orderedListMatch =
      trimmedLine.match(/^\d+\.\s+(.+)$/);

    if (orderedListMatch) {
      flushParagraph();

      if (listType !== "ordered-list") {
        flushList();
        listType = "ordered-list";
      }

      listItems.push(orderedListMatch[1]);
      continue;
    }

    const quoteMatch =
      trimmedLine.match(/^>\s?(.+)$/);

    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "quote",
        content: quoteMatch[1]
      });
      continue;
    }

    if (listType !== null && /^\s{2,}\S/.test(line) && listItems.length > 0) {
      listItems[listItems.length - 1] =
        `${listItems[listItems.length - 1]} ${trimmedLine}`;
      continue;
    }

    flushList();
    paragraphLines.push(trimmedLine);
  }

  if (codeLines !== null) {
    blocks.push({
      type: "code",
      content: codeLines.join("\n")
    });
  }

  flushParagraph();
  flushList();

  return blocks;
}

type Props = {
  content: string;
};

export default function ChatMarkdown({
  content
}: Props) {

  const blocks =
    parseMarkdown(content);

  return (
    <div className="chat-markdown">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre key={index}>
              <code>{block.content}</code>
            </pre>
          );
        }

        if (block.type === "heading") {
          const Heading =
            `h${block.level}` as "h2" | "h3" | "h4";

          return (
            <Heading key={index}>
              {renderInline(block.content)}
            </Heading>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={index}>
              {renderInline(block.content)}
            </blockquote>
          );
        }

        if (block.type === "paragraph") {
          return (
            <p key={index}>
              {renderInline(block.content)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}
