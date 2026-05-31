import type { CSSProperties, ReactNode } from "react";
import type { Locale } from "../../i18n";
import {
  getContentCacheEntry,
  rememberContentCacheEntry,
} from "../../lib/cardContentCache";
import type { GraphNode, ReferenceItem } from "../../types";

const globalParser = typeof window !== "undefined" ? new DOMParser() : null;

const INLINE_REFERENCE_TOKEN_PATTERN = /(\[#\d+\])/g;
const INLINE_REFERENCE_TOKEN_EXACT_PATTERN = /^\[(#\d+)\]$/;
const SUPPORTED_CONTENT_BACKGROUND_COLORS = new Set([
  "#fef08a",
  "#bbf7d0",
  "#bfdbfe",
  "#e9d5ff",
  "#fed7aa",
  "#fecaca",
]);

function getReferenceAriaLabel(reference: ReferenceItem, locale: Locale) {
  const isZh = locale === "zh-CN";
  return isZh
    ? `打开画布引用 ${reference.id}: ${reference.title}`
    : `Open canvas reference ${reference.id}: ${reference.title}`;
}

export function renderCardContent(
  node: GraphNode,
  onReferenceSelect: (nodeId: string | null) => void,
  searchQuery?: string,
  locale: Locale = "en-US"
): ReactNode {
  if (!node.contentHtml) {
    return null;
  }

  if (!searchQuery) {
    const referencesKey = JSON.stringify(node.references ?? []);
    const cached = getContentCacheEntry(node.id);
    if (
      cached &&
      cached.contentHtml === node.contentHtml &&
      cached.locale === locale &&
      cached.referencesKey === referencesKey
    ) {
      return cached.elements;
    }

    if (!globalParser) {
      return null;
    }

    const doc = globalParser.parseFromString(node.contentHtml, "text/html");
    const children = Array.from(doc.body.childNodes);

    const elements =
      children.length > 0
        ? children.map((child, index) =>
            renderContentNode(child, `${node.id}-${index}`, node, onReferenceSelect, locale)
          )
        : null;

    rememberContentCacheEntry(node.id, {
      contentHtml: node.contentHtml,
      locale,
      referencesKey,
      elements,
    });

    return elements;
  }

  if (!globalParser) {
    return null;
  }

  const doc = globalParser.parseFromString(node.contentHtml, "text/html");
  const children = Array.from(doc.body.childNodes);

  return children.length > 0
    ? children.map((child, index) =>
        renderContentNode(
          child,
          `${node.id}-${index}`,
          node,
          onReferenceSelect,
          locale,
          searchQuery
        )
      )
    : null;
}

function parseInlineStyle(style: string): CSSProperties {
  const result: Record<string, string> = {};
  const allowedProperties = new Set([
    "color",
    "backgroundColor",
    "textDecoration",
    "textDecorationLine",
    "textDecorationColor",
  ]);

  for (const part of style.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const property = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (property && value) {
      const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      if (allowedProperties.has(camelProperty) && isAllowedInlineStyleValue(camelProperty, value)) {
        result[camelProperty] = value;
      }
    }
  }

  return result;
}

function isAllowedInlineStyleValue(property: string, value: string) {
  if (property !== "backgroundColor") {
    return true;
  }

  return SUPPORTED_CONTENT_BACKGROUND_COLORS.has(value.toLowerCase());
}

function sanitizeBackgroundColor(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return SUPPORTED_CONTENT_BACKGROUND_COLORS.has(value.toLowerCase()) ? value : undefined;
}

function sanitizeHref(url: string): string {
  if (!url) return "#";
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  ) {
    return url;
  }
  return "#";
}

function renderContentNode(
  domNode: ChildNode,
  key: string,
  graphNode: GraphNode,
  onReferenceSelect: (nodeId: string | null) => void,
  locale: Locale,
  searchQuery?: string
): ReactNode {
  if (domNode.nodeType === Node.TEXT_NODE) {
    return renderTextWithReferences(
      domNode.textContent ?? "",
      key,
      graphNode,
      onReferenceSelect,
      locale,
      searchQuery
    );
  }

  if (!(domNode instanceof HTMLElement)) {
    return null;
  }

  const children = Array.from(domNode.childNodes).map((child, index) =>
    renderContentNode(child, `${key}-${index}`, graphNode, onReferenceSelect, locale, searchQuery)
  );

  if (domNode.tagName === "P") {
    return <p key={key}>{children}</p>;
  }

  if (domNode.tagName === "H1") {
    return <h1 key={key}>{children}</h1>;
  }

  if (domNode.tagName === "H2") {
    return <h2 key={key}>{children}</h2>;
  }

  if (domNode.tagName === "H3") {
    return <h3 key={key}>{children}</h3>;
  }

  if (domNode.tagName === "BLOCKQUOTE") {
    return <blockquote key={key}>{children}</blockquote>;
  }

  if (domNode.tagName === "PRE") {
    return <pre key={key}>{children}</pre>;
  }

  if (domNode.tagName === "CODE") {
    return <code key={key}>{children}</code>;
  }

  if (domNode.tagName === "HR") {
    return <hr key={key} />;
  }

  if (domNode.tagName === "DIV") {
    return <div key={key}>{children}</div>;
  }

  if (domNode.tagName === "LABEL") {
    return <label key={key}>{children}</label>;
  }

  if (domNode.tagName === "INPUT") {
    const type = domNode.getAttribute("type");
    if (type === "checkbox") {
      const checked =
        domNode.hasAttribute("checked") ||
        domNode.getAttribute("checked") === "checked" ||
        (domNode as HTMLInputElement).checked;
      return (
        <input
          key={key}
          type="checkbox"
          checked={checked}
          disabled={true}
          readOnly={true}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
  }

  if (domNode.tagName === "OL") {
    return <ol key={key}>{children}</ol>;
  }

  if (domNode.tagName === "UL") {
    const isTaskList = domNode.getAttribute("data-type") === "taskList";
    return (
      <ul
        key={key}
        className={isTaskList ? "graph-node__task-list" : undefined}
        data-type={domNode.getAttribute("data-type") ?? undefined}
      >
        {children}
      </ul>
    );
  }

  if (domNode.tagName === "LI") {
    const isTaskItem = domNode.getAttribute("data-type") === "taskItem";
    return (
      <li
        key={key}
        className={isTaskItem ? "graph-node__task-item" : undefined}
        data-type={domNode.getAttribute("data-type") ?? undefined}
        data-checked={domNode.getAttribute("data-checked") ?? undefined}
      >
        {children}
      </li>
    );
  }

  if (domNode.tagName === "BR") {
    return <br key={key} />;
  }

  if (domNode.tagName === "A") {
    const href = domNode.getAttribute("href") ?? "";
    const sanitized = sanitizeHref(href);

    return (
      <a
        className="graph-node__content-link nodrag nopan"
        href={sanitized}
        key={key}
        onClick={(event) => event.stopPropagation()}
        rel="noreferrer"
        target="_blank"
      >
        {children.length > 0 ? children : href}
      </a>
    );
  }

  if (domNode.tagName === "STRONG" || domNode.tagName === "B") {
    return <strong key={key}>{children}</strong>;
  }

  if (domNode.tagName === "EM" || domNode.tagName === "I") {
    return <em key={key}>{children}</em>;
  }

  if (domNode.tagName === "U") {
    return <u key={key}>{children}</u>;
  }

  if (domNode.tagName === "S" || domNode.tagName === "DEL") {
    return <s key={key}>{children}</s>;
  }

  if (domNode.tagName === "SPAN") {
    const style = domNode.getAttribute("style") ?? undefined;

    return (
      <span key={key} style={style ? parseInlineStyle(style) : undefined}>
        {children}
      </span>
    );
  }

  if (domNode.tagName === "MARK") {
    const markColor = sanitizeBackgroundColor(domNode.getAttribute("data-color") ?? undefined);

    return (
      <mark key={key} style={markColor ? { backgroundColor: markColor } : undefined}>
        {children}
      </mark>
    );
  }

  return <span key={key}>{children}</span>;
}

function renderTextWithReferences(
  text: string,
  key: string,
  node: GraphNode,
  onReferenceSelect: (nodeId: string | null) => void,
  locale: Locale,
  searchQuery?: string
) {
  const referencesById = new Map(
    (node.references ?? []).map((reference) => [reference.id, reference])
  );

  if (searchQuery && searchQuery.trim() && text.toLowerCase().includes(searchQuery.toLowerCase())) {
    return highlightTextWithReferences(
      text,
      key,
      node,
      onReferenceSelect,
      referencesById,
      locale,
      searchQuery
    );
  }

  const tokens = text.split(INLINE_REFERENCE_TOKEN_PATTERN);

  return tokens.map((token, index) => {
    const match = INLINE_REFERENCE_TOKEN_EXACT_PATTERN.exec(token);
    const reference = match ? referencesById.get(match[1]) : undefined;

    if (!reference) {
      return token;
    }

    return (
      <button
        aria-label={getReferenceAriaLabel(reference, locale)}
        className="graph-node__citation-link nodrag nopan"
        key={`${key}-${index}`}
        onClick={(event) => {
          event.stopPropagation();
          onReferenceSelect(reference.id);
        }}
        type="button"
      >
        {token}
      </button>
    );
  });
}

function highlightTextWithReferences(
  text: string,
  key: string,
  node: GraphNode,
  onReferenceSelect: (nodeId: string | null) => void,
  referencesById: Map<string, ReferenceItem>,
  locale: Locale,
  searchQuery: string
): ReactNode[] {
  const lowerQuery = searchQuery.toLowerCase();
  const parts: ReactNode[] = [];
  let remaining = text;
  let partIndex = 0;

  while (remaining.length > 0) {
    const lowerRemaining = remaining.toLowerCase();
    const idx = lowerRemaining.indexOf(lowerQuery);

    if (idx === -1) {
      const tokens = remaining.split(INLINE_REFERENCE_TOKEN_PATTERN);
      tokens.forEach((token) => {
        if (!token) return;
        const refMatch = INLINE_REFERENCE_TOKEN_EXACT_PATTERN.exec(token);
        const reference = refMatch ? referencesById.get(refMatch[1]) : undefined;
        if (reference) {
          parts.push(
            <button
              aria-label={getReferenceAriaLabel(reference, locale)}
              className="graph-node__citation-link nodrag nopan"
              key={`${key}-${partIndex++}`}
              onClick={(event) => {
                event.stopPropagation();
                onReferenceSelect(reference.id);
              }}
              type="button"
            >
              {token}
            </button>
          );
        } else {
          parts.push(<>{token}</>);
        }
      });
      break;
    }

    if (idx > 0) {
      const before = remaining.slice(0, idx);
      const tokens = before.split(INLINE_REFERENCE_TOKEN_PATTERN);
      tokens.forEach((token) => {
        if (!token) return;
        const refMatch = INLINE_REFERENCE_TOKEN_EXACT_PATTERN.exec(token);
        const reference = refMatch ? referencesById.get(refMatch[1]) : undefined;
        if (reference) {
          parts.push(
            <button
              aria-label={getReferenceAriaLabel(reference, locale)}
              className="graph-node__citation-link nodrag nopan"
              key={`${key}-${partIndex++}`}
              onClick={(event) => {
                event.stopPropagation();
                onReferenceSelect(reference.id);
              }}
              type="button"
            >
              {token}
            </button>
          );
        } else {
          parts.push(<>{token}</>);
        }
      });
    }

    parts.push(
      <mark className="search-highlight" key={`${key}-${partIndex++}`}>
        {remaining.slice(idx, idx + searchQuery.length)}
      </mark>
    );
    remaining = remaining.slice(idx + searchQuery.length);
  }

  return parts;
}
