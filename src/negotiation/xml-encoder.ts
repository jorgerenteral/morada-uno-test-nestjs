/**
 * Minimal value to XML encoder for API payloads.
 *
 * Objects become child elements named after their keys, arrays become
 * repeated <item> elements, null becomes an empty element flagged with
 * nil="true" and booleans are written as true/false.
 */
export function encodeXml(data: unknown, root = 'response'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${element(root, data, 0)}\n`;
}

function element(name: string, value: unknown, depth: number): string {
  const tag = elementName(name);
  const indent = '  '.repeat(depth);

  if (value === null || value === undefined) {
    return `${indent}<${tag} nil="true"/>`;
  }

  if (Array.isArray(value)) {
    return wrap(
      tag,
      indent,
      value.map((child) => element('item', child, depth + 1)),
    );
  }

  if (value instanceof Date) {
    return `${indent}<${tag}>${value.toISOString()}</${tag}>`;
  }

  if (typeof value === 'object') {
    return wrap(
      tag,
      indent,
      Object.entries(value).map(([key, child]) =>
        element(key, child, depth + 1),
      ),
    );
  }

  return `${indent}<${tag}>${escape(String(value as string | number | boolean | bigint))}</${tag}>`;
}

function wrap(tag: string, indent: string, children: string[]): string {
  return children.length === 0
    ? `${indent}<${tag}/>`
    : `${indent}<${tag}>\n${children.join('\n')}\n${indent}</${tag}>`;
}

/** Keys that are not valid XML names (digits first, spaces...) fall back to <item>. */
function elementName(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(name) ? name : 'item';
}

function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
