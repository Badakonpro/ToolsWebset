/**
 * Fetches the latest VoxOver release from GitHub at build time.
 * All Astro pages import this so version / download URL auto-update on every deploy.
 */

export interface LatestRelease {
  tag: string;         // "v1.3.1"
  version: string;     // "1.3.1"
  date: string;        // "2026-05-29"
  dmgUrl: string;
  dmgFilename: string;
  dmgSizeMB: string;   // "~112 MB"
  releaseUrl: string;
}

export interface LatestReleaseSummary {
  tag: string;
  date: string;
  releaseUrl: string;
  highlights: string[];
}

const FALLBACK: LatestRelease = {
  tag: "v2.0.1",
  version: "2.0.1",
  date: "2026-05-31",
  dmgUrl: "https://github.com/Badakonpro/ai-translate-dub/releases/download/v2.0.1/VoxOver-2.0.0-native-arm64.dmg",
  dmgFilename: "VoxOver-2.0.0-native-arm64.dmg",
  dmgSizeMB: "~22 MB",
  releaseUrl: "https://github.com/Badakonpro/ai-translate-dub/releases/tag/v2.0.1",
};

export async function getLatestRelease(): Promise<LatestRelease> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/Badakonpro/ai-translate-dub/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return FALLBACK;

    const data = await res.json();

    const tag: string = data.tag_name ?? FALLBACK.tag;
    const version = tag.replace(/^v/, "");
    const date = data.published_at ? (data.published_at as string).split("T")[0] : FALLBACK.date;
    const releaseUrl: string = data.html_url ?? `https://github.com/Badakonpro/ai-translate-dub/releases/tag/${tag}`;

    interface Asset { name: string; browser_download_url: string; size: number; }
    const dmgAsset: Asset | undefined = (data.assets as Asset[] | undefined)
      ?.find((a) => a.name.endsWith("-arm64.dmg"));

    const dmgUrl = dmgAsset?.browser_download_url
      ?? `https://github.com/Badakonpro/ai-translate-dub/releases/download/${tag}/VoxOver-${version}-arm64.dmg`;
    const dmgFilename = dmgAsset?.name ?? `VoxOver-${version}-arm64.dmg`;
    const dmgSizeMB = dmgAsset
      ? `~${Math.round(dmgAsset.size / 1024 / 1024)} MB`
      : FALLBACK.dmgSizeMB;

    return { tag, version, date, dmgUrl, dmgFilename, dmgSizeMB, releaseUrl };
  } catch {
    return FALLBACK;
  }
}

export async function getLatestReleaseSummary(): Promise<LatestReleaseSummary> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/Badakonpro/ai-translate-dub/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) {
      return {
        tag: FALLBACK.tag,
        date: FALLBACK.date,
        releaseUrl: FALLBACK.releaseUrl,
        highlights: ["See GitHub Release notes for full details."],
      };
    }

    const data = await res.json();
    const tag: string = data.tag_name ?? FALLBACK.tag;
    const date = data.published_at ? (data.published_at as string).split("T")[0] : FALLBACK.date;
    const releaseUrl: string = data.html_url ?? `https://github.com/Badakonpro/ai-translate-dub/releases/tag/${tag}`;

    const body = typeof data.body === "string" ? data.body : "";
    const highlights = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
      .filter((line) => line.length > 0)
      .slice(0, 8);

    return {
      tag,
      date,
      releaseUrl,
      highlights: highlights.length > 0
        ? highlights
        : ["See GitHub Release notes for full details."],
    };
  } catch {
    return {
      tag: FALLBACK.tag,
      date: FALLBACK.date,
      releaseUrl: FALLBACK.releaseUrl,
      highlights: ["See GitHub Release notes for full details."],
    };
  }
}
