import assert from "node:assert/strict";

import { extractMagnetsFromText, normalizeBtih, parseFeedContent } from "../parser.js";

const htmlText = '下载 <a href="magnet:?xt=urn:btih:ABCDEF1234567890&amp;dn=test">link</a>';
assert.deepEqual(extractMagnetsFromText(htmlText), ["magnet:?xt=urn:btih:ABCDEF1234567890&dn=test"]);

assert.equal(normalizeBtih("magnet:?xt=urn:btih:ABCDEF1234567890&dn=x"), "abcdef1234567890");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Episode 1</title>
    <description><![CDATA[magnet:?xt=urn:btih:ABCDEF1234567890&dn=a]]></description>
  </item>
  <item>
    <title>Episode duplicate</title>
    <link>magnet:?xt=urn:btih:abcdef1234567890&dn=b</link>
  </item>
</channel></rss>`;

const items = parseFeedContent("https://example.test/feed.xml", feed);
assert.equal(items.length, 1);
assert.equal(items[0].hash, "abcdef1234567890");
assert.equal(items[0].title, "Episode 1");
assert.equal(items[0].filename, "a");

console.log("parser tests passed");
