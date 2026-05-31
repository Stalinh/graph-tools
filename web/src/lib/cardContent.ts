const PLAIN_TEXT_TAGS = new Set(["P", "BR"]);
const globalDOMParser = typeof window !== "undefined" ? new DOMParser() : null;

export function getPlainTextContent(contentHtml: string | undefined) {
  if (!contentHtml) {
    return "";
  }

  if (!globalDOMParser) {
    return contentHtml
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const document = globalDOMParser.parseFromString(contentHtml, "text/html");
  return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function isPlainTextCardContent(contentHtml: string | undefined) {
  if (!contentHtml) {
    return true;
  }

  const document = new DOMParser().parseFromString(contentHtml, "text/html");
  const elements = Array.from(document.body.querySelectorAll("*"));

  if (elements.length === 0) {
    return true;
  }

  return elements.every((element) => PLAIN_TEXT_TAGS.has(element.tagName));
}

export function cardContentToPlainText(contentHtml: string | undefined) {
  if (!contentHtml) {
    return "";
  }

  const document = new DOMParser().parseFromString(contentHtml, "text/html");
  const paragraphs = Array.from(document.body.querySelectorAll("p"));

  if (paragraphs.length === 0) {
    return document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  return paragraphs
    .map((paragraph) =>
      Array.from(paragraph.childNodes)
        .map((child) => (child.nodeName === "BR" ? "\n" : (child.textContent ?? "")))
        .join("")
        .trim()
    )
    .join("\n\n")
    .trim();
}

export function plainTextToCardContent(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "<p></p>";
  }

  const document = new DOMParser().parseFromString("<body></body>", "text/html");
  const paragraphs = normalized.split(/\n{2,}/);

  paragraphs.forEach((paragraphText) => {
    const paragraph = document.createElement("p");
    const lines = paragraphText.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        paragraph.appendChild(document.createElement("br"));
      }
      paragraph.appendChild(document.createTextNode(line));
    });
    document.body.appendChild(paragraph);
  });

  return document.body.innerHTML || "<p></p>";
}
