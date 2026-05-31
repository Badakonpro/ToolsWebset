/**
 * Cloudflare Worker entry point.
 * - Handles /count and /download API routes for download tracking.
 * - Passes all other requests to the static asset binding.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    // GET /count?asset=xxx — return current count
    if (request.method === "GET" && url.pathname === "/count") {
      const asset = url.searchParams.get("asset") || "unknown";
      const val = await env.DOWNLOAD_COUNTS.get(asset);
      const count = val ? parseInt(val) : 0;
      return Response.json({ asset, count });
    }

    // POST /download?asset=xxx — increment and return new count
    if (request.method === "POST" && url.pathname === "/download") {
      const asset = url.searchParams.get("asset") || "unknown";
      const val = await env.DOWNLOAD_COUNTS.get(asset);
      const count = (val ? parseInt(val) : 0) + 1;
      await env.DOWNLOAD_COUNTS.put(asset, String(count));
      return Response.json({ asset, count });
    }

    // Serve static assets for everything else
    return env.ASSETS.fetch(request);
  },
};
