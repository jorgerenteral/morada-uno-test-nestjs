export type ResponseFormat = 'json' | 'xml';

const MEDIA_TYPES: Record<string, ResponseFormat[]> = {
  '*/*': ['json', 'xml'],
  'application/*': ['json', 'xml'],
  'application/json': ['json'],
  'text/json': ['json'],
  'application/xml': ['xml'],
  'text/xml': ['xml'],
};

/**
 * Picks the response format for an `Accept` header, or null when none of the
 * supported formats is acceptable (the caller answers 406).
 *
 * The supported type with the highest quality value wins and JSON wins ties,
 * so a missing header or wildcards resolve to JSON.
 */
export function negotiateFormat(
  accept: string | undefined,
): ResponseFormat | null {
  if (!accept || accept.trim() === '') {
    return 'json';
  }

  const quality: Record<ResponseFormat, number> = { json: 0, xml: 0 };
  let fromBrowser = false;

  for (const part of accept.split(',')) {
    const [type, ...params] = part
      .toLowerCase()
      .split(';')
      .map((segment) => segment.trim());
    const qParam = params.find((param) => param.startsWith('q='));
    const q = qParam ? Number(qParam.slice(2)) : 1;

    fromBrowser = fromBrowser || type === 'text/html';

    for (const format of MEDIA_TYPES[type] ?? []) {
      quality[format] = Math.max(quality[format], Number.isNaN(q) ? 0 : q);
    }
  }

  if (quality.json <= 0 && quality.xml <= 0) {
    return null;
  }

  // Browsers send "text/html,...,application/xml;q=0.9,*/*;q=0.8". That is not
  // a request for XML, so JSON stays the default for them.
  if (fromBrowser && quality.json > 0) {
    return 'json';
  }

  return quality.xml > quality.json ? 'xml' : 'json';
}
