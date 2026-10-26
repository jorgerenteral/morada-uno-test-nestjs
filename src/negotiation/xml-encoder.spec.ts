import { encodeXml } from './xml-encoder.js';

describe('encodeXml', () => {
  it('encodes objects as child elements', () => {
    const xml = encodeXml({ id: 1, title: 'Adventures', published: true });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<response>');
    expect(xml).toContain('<id>1</id>');
    expect(xml).toContain('<title>Adventures</title>');
    expect(xml).toContain('<published>true</published>');
  });

  it('encodes arrays as repeated items', () => {
    const xml = encodeXml([{ id: 1 }, { id: 2 }]);

    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain('<id>2</id>');
  });

  it('flags null as nil', () => {
    expect(encodeXml({ cover_image_url: null })).toContain(
      '<cover_image_url nil="true"/>',
    );
  });

  it('encodes empty arrays as an empty element', () => {
    expect(encodeXml([])).toContain('<response/>');
  });

  it('escapes special characters', () => {
    expect(encodeXml({ title: `Tom & <Jerry> "q" 'a'` })).toContain(
      '<title>Tom &amp; &lt;Jerry&gt; &quot;q&quot; &apos;a&apos;</title>',
    );
  });

  it('falls back to item for invalid element names', () => {
    const xml = encodeXml({ '1': 'a', ok: 'b' });

    expect(xml).toContain('<item>a</item>');
    expect(xml).toContain('<ok>b</ok>');
  });
});
