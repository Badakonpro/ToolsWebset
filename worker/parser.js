const MAGNET_RE = /magnet:\?[^<>'"\s]+/gi;

const HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

export function decodeHtml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-zA-Z0-9#]+);/g, (match, key) => HTML_ENTITIES[key] ?? match);
}

export function extractMagnetsFromText(value = "") {
  const decoded = decodeHtml(value);
  const magnets = [];
  for (const match of decoded.matchAll(MAGNET_RE)) {
    magnets.push(match[0].replace(/[.,);\]]+$/g, ""));
  }
  return [...new Set(magnets)];
}

export function normalizeBtih(magnet) {
  const decoded = decodeHtml(magnet);
  const queryStart = decoded.indexOf("?");
  const query = decoded.toLowerCase().startsWith("magnet:") && queryStart >= 0 ? decoded.slice(queryStart + 1) : decoded;
  const params = new URLSearchParams(query);
  const xt = params.get("xt");
  if (xt?.toLowerCase().startsWith("urn:btih:")) {
    return xt.split(":").pop().trim().toLowerCase();
  }
  const direct = decoded.match(/(?:^|[?&])xt=urn:btih:([^&]+)/i);
  return direct ? direct[1].trim().toLowerCase() : "";
}

export function magnetDisplayName(magnet) {
  const decoded = decodeHtml(magnet);
  const queryStart = decoded.indexOf("?");
  if (queryStart < 0) {
    return "";
  }
  const params = new URLSearchParams(decoded.slice(queryStart + 1));
  return params.get("dn")?.trim() || "";
}

function extractTitle(fragment) {
  const titleMatch = fragment.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? decodeHtml(titleMatch[1]).trim() : "";
}

function feedFragments(content) {
  const fragments = [];
  for (const match of content.matchAll(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/gi)) {
    fragments.push(match[0]);
  }
  return fragments.length ? fragments : [content];
}

export function parseFeedContent(feedUrl, content) {
  const items = new Map();
  for (const fragment of feedFragments(content)) {
    const title = extractTitle(fragment);
    for (const magnet of extractMagnetsFromText(fragment)) {
      const hash = normalizeBtih(magnet);
      if (!hash || items.has(hash)) {
        continue;
      }
      items.set(hash, {
        hash,
        magnet,
        title: title || hash,
        filename: magnetDisplayName(magnet),
        feed_url: feedUrl,
      });
    }
  }
  return [...items.values()];
}

export function mergeFeedItems(feeds) {
  const items = new Map();
  for (const feedItems of feeds) {
    for (const item of feedItems) {
      if (!items.has(item.hash)) {
        items.set(item.hash, item);
      }
    }
  }
  return [...items.values()];
}
