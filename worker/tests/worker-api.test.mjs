import assert from "node:assert/strict";

import worker from "../index.js";

const aiResponse = await worker.fetch(
  new Request("https://lingyuetools.org/api/rss/ai-select", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          hash: "abc",
          magnet: "magnet:?xt=urn:btih:abc&dn=test.mkv",
          title: "test 1080p 简体",
          feed_url: "https://example.test/feed.xml",
        },
      ],
      preferences: { language: "zh-cn", quality: "1080p" },
    }),
  }),
  {},
);
assert.equal(aiResponse.status, 503);
const aiBody = await aiResponse.json();
assert.equal(aiBody.ok, false);
assert.equal(aiBody.code, "deepseek_key_missing");

const statusResponse = await worker.fetch(new Request("https://lingyuetools.org/api/ai/status"), {});
assert.equal(statusResponse.status, 200);
const statusBody = await statusResponse.json();
assert.equal(statusBody.provider.configured, false);
assert.equal(statusBody.presets.language.some((preset) => preset.id === "zh-cn"), true);
assert.equal("terms" in statusBody.presets.language.find((preset) => preset.id === "zh-cn"), false);

const homeResponse = await worker.fetch(new Request("https://lingyuetools.org/"), {});
assert.equal(homeResponse.status, 200);
const homeHtml = await homeResponse.text();
assert.equal(homeHtml.includes('id="homeView"'), true);
assert.equal(homeHtml.includes('id="rssToolView"'), true);
assert.equal(homeHtml.includes('href="/tools/rss-magnet"'), true);
assert.equal(homeHtml.includes("工具主页"), true);
assert.equal(homeHtml.includes('class="sidebar"'), false);
assert.equal(homeHtml.includes('class="site-header"'), true);
assert.equal(homeHtml.includes('class="top-nav"'), true);
assert.equal(homeHtml.includes("document.startViewTransition"), true);
assert.equal(homeHtml.includes("::view-transition-new(page-content)"), true);

const toolResponse = await worker.fetch(new Request("https://lingyuetools.org/tools/rss-magnet"), {});
assert.equal(toolResponse.status, 200);
const toolHtml = await toolResponse.text();
assert.equal(toolHtml.includes("RSS 磁力提取"), true);
assert.equal(toolHtml.includes("navigateTo(window.location.pathname, false)"), true);

const originalFetch = globalThis.fetch;
let authorizationHeader = "";
let tempKeyCallCount = 0;
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.deepseek.com/chat/completions");
  authorizationHeader = options.headers.authorization;
  tempKeyCallCount += 1;
  if (tempKeyCallCount === 1) {
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              episodes: [{ episode_key: "test", label: "测试集", candidate_hashes: ["abc"] }],
              skipped_hashes: [],
              summary: "总览到 1 组。",
            }),
          },
        },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            selected_hashes: ["abc"],
            rejected: [],
            summary: "保留测试版本",
          }),
        },
      },
    ],
  }), { status: 200, headers: { "content-type": "application/json" } });
};

try {
  const tempKeyResponse = await worker.fetch(
    new Request("https://lingyuetools.org/api/rss/ai-select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deepseek_api_key: "sk-temp",
        items: [
          {
            hash: "abc",
            magnet: "magnet:?xt=urn:btih:abc&dn=test.mkv",
            title: "test 1080p 简体",
            feed_url: "https://example.test/feed.xml",
          },
        ],
        preferences: { language: "zh-cn", quality: "1080p" },
      }),
    }),
    {},
  );
  assert.equal(tempKeyResponse.status, 200);
  const tempKeyBody = await tempKeyResponse.json();
  assert.equal(authorizationHeader, "Bearer sk-temp");
  assert.equal(tempKeyCallCount, 2);
  assert.equal(tempKeyBody.count, 1);
  assert.equal(tempKeyBody.selected_items[0].hash, "abc");
  assert.equal(tempKeyBody.episode_plan.source, "ai_overview_then_per_episode");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("worker api tests passed");
