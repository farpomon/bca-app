import sanitizeHtml from "sanitize-html";

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe formatting tags while removing dangerous scripts and attributes
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      // Text formatting
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      // Headings
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      // Lists
      "ul",
      "ol",
      "li",
      // Links
      "a",
      // Blocks
      "blockquote",
      "pre",
      "code",
      // Tables (optional, for future use)
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      // Allow class for styling
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
    },
    // Transform links to open in new tab and add noopener
    transformTags: {
      a: (tagName, attribs) => {
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },
    },
  });
}

/**
 * Strip all HTML tags and return plain text
 * Useful for search indexing and previews
 */
export function stripHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

/**
 * Truncate HTML content to a certain length while preserving tags
 */
export function truncateHtml(html: string, maxLength: number): string {
  const plainText = stripHtml(html);
  if (plainText.length <= maxLength) {
    return html;
  }

  // Simple truncation - in production, use a library like html-truncate
  const truncated = plainText.substring(0, maxLength) + "...";
  return `<p>${truncated}</p>`;
}
