import { negotiateFormat } from './accept.js';

describe('negotiateFormat', () => {
  it.each([
    [undefined, 'json'],
    ['', 'json'],
    ['*/*', 'json'],
    ['application/*', 'json'],
    ['application/json', 'json'],
    ['APPLICATION/JSON', 'json'],
    ['application/xml', 'xml'],
    ['text/xml', 'xml'],
    ['text/html, */*;q=0.8', 'json'],
    ['application/json;q=0.5, application/xml;q=0.9', 'xml'],
    ['application/xml;q=0.2, application/json', 'json'],
    ['application/xml, application/json', 'json'],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'json'],
  ])('resolves %j to %s', (accept, expected) => {
    expect(negotiateFormat(accept)).toBe(expected);
  });

  it.each(['text/html', 'text/csv', 'application/yaml', 'application/xml;q=0'])(
    'rejects %s',
    (accept) => {
      expect(negotiateFormat(accept)).toBeNull();
    },
  );
});
