import { ACCOUNT_DESIGN, TOOLS, renderPage } from "./app-page.js";
import {
  AI_FILTER_PRESETS,
  AiSelectionError,
  aiProviderMeta,
  buildAvailableAiPresetsWithAi,
  normalizeAiPreferences,
  selectItemsWithAi,
} from "./ai-selector.js";
import {
  AuthError,
  clearSessionCookie,
  getSessionUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  sessionCookie,
} from "./auth.js";
import { mergeFeedItems, parseFeedContent } from "./parser.js";

class ApiError extends Error {
  constructor(status, detail, code = "api_error") {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers({
    "content-type": "application/json;charset=utf-8",
    "cache-control": "no-store",
  });
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.append(key, value);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new AuthError(400, "Invalid JSON body.", "invalid_json");
  }
}

function accountMeta(env) {
  return {
    enabled: Boolean(env?.DB),
    provider: "d1-session",
    design: ACCOUNT_DESIGN,
  };
}

async function accountSession(request, env) {
  return jsonResponse({
    ok: true,
    user: await getSessionUser(request, env),
    accounts: accountMeta(env),
  });
}

async function accountRegister(request, env) {
  const result = await registerAccount(request, env, await readJson(request));
  return jsonResponse(
    {
      ok: true,
      user: result.user,
      accounts: accountMeta(env),
    },
    201,
    { "set-cookie": sessionCookie(result.session.token, request) },
  );
}

async function accountLogin(request, env) {
  const result = await loginAccount(request, env, await readJson(request));
  return jsonResponse(
    {
      ok: true,
      user: result.user,
      accounts: accountMeta(env),
    },
    200,
    { "set-cookie": sessionCookie(result.session.token, request) },
  );
}

async function accountLogout(request, env) {
  await logoutAccount(request, env);
  return jsonResponse(
    {
      ok: true,
      user: null,
      accounts: accountMeta(env),
    },
    200,
    { "set-cookie": clearSessionCookie(request) },
  );
}

async function extractRss(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, detail: "Invalid JSON body." }, 400);
  }

  const feeds = Array.isArray(payload.feeds) ? payload.feeds.map((feed) => String(feed).trim()).filter(Boolean) : [];
  if (!feeds.length) {
    return jsonResponse({ ok: false, detail: "At least one RSS URL is required." }, 400);
  }

  const items = await fetchFeedItems(feeds);
  let aiOptions = null;
  let aiOptionsError = null;
  try {
    aiOptions = await buildAvailableAiPresetsWithAi(items, env);
  } catch (error) {
    aiOptionsError = {
      detail: error?.detail || error?.message || "AI preset detection failed.",
      code: error?.code || "ai_options_failed",
    };
  }
  const magnets = items.map((item) => item.magnet);
  return jsonResponse({
    ok: true,
    items,
    magnets,
    text: magnets.join("\n"),
    count: magnets.length,
    ai_options: aiOptions,
    ai_options_error: aiOptionsError,
  });
}

async function fetchFeedItems(feeds) {
  const parsedFeeds = [];
  for (const feedUrl of feeds) {
    let response;
    try {
      response = await fetch(feedUrl, {
        headers: {
          "user-agent": "lingyuetool-rss-magnet/0.2",
          accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
      });
    } catch (error) {
      throw new ApiError(502, `RSS fetch failed for ${feedUrl}: ${error.message}`, "rss_fetch_failed");
    }
    if (!response.ok) {
      throw new ApiError(502, `RSS fetch failed for ${feedUrl}: HTTP ${response.status}`, "rss_fetch_failed");
    }
    const content = await response.text();
    parsedFeeds.push(parseFeedContent(feedUrl, content));
  }
  return mergeFeedItems(parsedFeeds);
}

function normalizeIncomingItems(items) {
  return Array.isArray(items)
    ? items
        .map((item) => ({
          hash: String(item?.hash || "").toLowerCase(),
          magnet: String(item?.magnet || ""),
          title: String(item?.title || item?.hash || ""),
          filename: String(item?.filename || ""),
          feed_url: String(item?.feed_url || ""),
        }))
        .filter((item) => item.hash && item.magnet)
    : [];
}

async function aiSelectRss(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, detail: "Invalid JSON body." }, 400);
  }
  const preferences = normalizeAiPreferences(payload.preferences || {});
  let items = normalizeIncomingItems(payload.items);
  if (!items.length) {
    const feeds = Array.isArray(payload.feeds) ? payload.feeds.map((feed) => String(feed).trim()).filter(Boolean) : [];
    if (!feeds.length) {
      return jsonResponse({ ok: false, detail: "At least one RSS URL or item list is required." }, 400);
    }
    items = await fetchFeedItems(feeds);
  }
  const requestKey = String(payload.deepseek_api_key || "").trim();
  const aiEnv = requestKey ? { ...env, DEEPSEEK_API_KEY: requestKey } : env;
  const result = await selectItemsWithAi(items, preferences, aiEnv);
  return jsonResponse(result);
}

async function routeApi(request, env, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/tools") {
      return jsonResponse({ ok: true, tools: TOOLS });
    }
    if (request.method === "GET" && url.pathname === "/api/ai/presets") {
      return jsonResponse({ ok: true, presets: AI_FILTER_PRESETS });
    }
    if (request.method === "GET" && url.pathname === "/api/ai/status") {
      return jsonResponse({ ok: true, provider: aiProviderMeta(env), presets: AI_FILTER_PRESETS });
    }
    if (request.method === "GET" && url.pathname === "/api/account/session") {
      return await accountSession(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/account/register") {
      return await accountRegister(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/account/login") {
      return await accountLogin(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/account/logout") {
      return await accountLogout(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/rss/extract") {
      return await extractRss(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/rss/ai-select") {
      return await aiSelectRss(request, env);
    }
  } catch (error) {
    if (error instanceof AuthError || error instanceof AiSelectionError || error instanceof ApiError) {
      return jsonResponse({ ok: false, detail: error.detail, code: error.code }, error.status);
    }
    return jsonResponse({ ok: false, detail: "Internal server error." }, 500);
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiResponse = await routeApi(request, env, url);
    if (apiResponse) {
      return apiResponse;
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.startsWith("/tools/"))) {
      return new Response(renderPage(), {
        headers: {
          "content-type": "text/html;charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};
