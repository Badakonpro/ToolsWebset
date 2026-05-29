/**
 * Fetches the latest YTDownloader release from GitHub at build time.
 */

export interface YTDRelease {
  tag: string;         // "v1.0.0"
  version: string;     // "1.0.0"
  date: string;        // "2026-05-29"
  dmgUrl: string;
  dmgFilename: string;
  dmgSizeMB: string;
  releaseUrl: string;
}

const FALLBACK: YTDRelease = {
  tag: "v1.0.0",
  version: "1.0.0",
  date: "2026-05-29",
  dmgUrl: "https://github.com/Badakonpro/YTDownloader/releases/download/v1.0.0/YTDownloader-v1.0.0-arm64.dmg",
  dmgFilename: "YTDownloader-v1.0.0-arm64.dmg",
  dmgSizeMB: "",
  releaseUrl: "https://github.com/Badakonpro/YTDownloader/releases/tag/v1.0.0",
};

export async function getLatestYTDRelease(): Promise<YTDRelease> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/Badakonpro/YTDownloader/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return FALLBACK;

    const data = await res.json();

    const tag: string = data.tag_name ?? FALLBACK.tag;
    const version = tag.replace(/^v/, "");
    const date = data.published_at ? (data.published_at as string).split("T")[0] : FALLBACK.date;
    const releaseUrl: string = data.html_url ?? `https://github.com/Badakonpro/YTDownloader/releases/tag/${tag}`;

    interface Asset { name: string; browser_download_url: string; size: number; }
    const dmgAsset: Asset | undefined = (data.assets as Asset[] | undefined)
      ?.find((a) => a.name.endsWith("-arm64.dmg"));

    const dmgUrl = dmgAsset?.browser_download_url
      ?? `https://github.com/Badakonpro/YTDownloader/releases/download/${tag}/YTDownloader-${tag}-arm64.dmg`;
    const dmgFilename = dmgAsset?.name ?? `YTDownloader-${tag}-arm64.dmg`;
    const dmgSizeMB = dmgAsset
      ? `~${Math.round(dmgAsset.size / 1024 / 1024)} MB`
      : "";

    return { tag, version, date, dmgUrl, dmgFilename, dmgSizeMB, releaseUrl };
  } catch {
    return FALLBACK;
  }
}
