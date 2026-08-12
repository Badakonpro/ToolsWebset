import assert from "node:assert/strict";

import {
  AiSelectionError,
  aiProviderMeta,
  buildAvailableAiPresetsWithAi,
  buildAiSelectionPrompt,
  directFormatForItem,
  normalizeAiPreferences,
  normalizeAvailableAiPresets,
  resolveDeepSeekApiKey,
  selectItemsWithAi,
} from "../ai-selector.js";

const items = [
  {
    hash: "aaa111",
    title: "[Group] Show 01 [1080p][简体][x264]",
    filename: "Show.01.1080p.CHS.x264.mkv",
    magnet: "magnet:?xt=urn:btih:aaa111&dn=Show.01.1080p.CHS.x264.mkv",
    feed_url: "https://example.test/feed.xml",
  },
  {
    hash: "bbb222",
    title: "[Group] Show 01 [720p][繁体][x265]",
    filename: "Show.01.720p.CHT.x265.mkv",
    magnet: "magnet:?xt=urn:btih:bbb222&dn=Show.01.720p.CHT.x265.mkv",
    feed_url: "https://example.test/feed.xml",
  },
];

assert.deepEqual(normalizeAiPreferences({ language: "zh-cn", quality: "1080p", mode: "all_matching" }), {
  language: "zh-cn",
  quality: "1080p",
  subtitle: "any",
  container: "any",
  codec: "any",
  mode: "all_matching",
});

assert.equal(aiProviderMeta({ DEEPSEEK_API_KEY: "x" }).configured, true);
assert.equal(aiProviderMeta({}).configured, false);
assert.equal(resolveDeepSeekApiKey({ "sk-test_abcdefghijklmnopqrstuvwxyz": "placeholder" }).key, "sk-test_abcdefghijklmnopqrstuvwxyz");
assert.equal(resolveDeepSeekApiKey({ MISNAMED: "sk-value_abcdefghijklmnopqrstuvwxyz" }).key, "sk-value_abcdefghijklmnopqrstuvwxyz");

const prompt = buildAiSelectionPrompt(items, { language: "zh-cn", quality: "1080p" });
assert.equal(prompt.preferences.language.label, "简体中文");
assert.equal(prompt.preferences.language.decision, "ai_judged");
assert.equal("terms" in prompt.preferences.language, false);
assert.equal(prompt.preferences.container.decision, "direct_format");
assert.equal(prompt.candidates[0].direct_format.container, "mkv");
assert.equal(prompt.candidates.length, 2);
assert.equal(prompt.candidates[0].hash, "aaa111");

assert.deepEqual(directFormatForItem({
  title: "Show [MKV]",
  filename: "",
  magnet: "magnet:?xt=urn:btih:ccc333",
}), { container: "mkv" });

const available = normalizeAvailableAiPresets({
  available: {
    language: ["zh-cn", "zh-tw"],
    quality: ["1080p", "720p"],
    subtitle: ["subbed"],
    codec: ["h264"],
  },
  counts: {
    language: { "zh-cn": 1, "zh-tw": 1 },
    quality: { "1080p": 1, "720p": 1 },
    subtitle: { subbed: 2 },
    codec: { h264: 1 },
  },
  defaults: { language: "zh-cn", quality: "1080p", subtitle: "subbed" },
  summary: "识别到简体、繁体、1080p、720p。",
});
assert.deepEqual(available.options.language.map((option) => option.id), ["zh-cn", "zh-tw", "any"]);
assert.deepEqual(available.options.quality.map((option) => option.id), ["1080p", "720p", "any"]);
assert.equal(available.options.subtitle.find((option) => option.id === "subbed").count, 2);
assert.equal(available.options.codec.find((option) => option.id === "h264").count, 1);
assert.equal(available.defaults.language, "zh-cn");
assert.equal(available.defaults.quality, "1080p");

const availableWithDirectFormat = normalizeAvailableAiPresets(
  {
    available: { language: ["zh-cn"], quality: ["1080p"] },
    counts: { language: { "zh-cn": 1 }, quality: { "1080p": 1 } },
  },
  {
    available: { container: ["mkv"] },
    counts: { container: { mkv: 2 } },
  },
);
assert.deepEqual(availableWithDirectFormat.options.container.map((option) => option.id), ["mkv", "any"]);
assert.equal(availableWithDirectFormat.options.container[0].count, 2);

const availableWithAnyDefaults = normalizeAvailableAiPresets({
  available: { language: ["zh-cn"], quality: ["1080p"], subtitle: ["subbed"] },
  counts: { language: { "zh-cn": 10 }, quality: { "1080p": 17 }, subtitle: { subbed: 17 } },
  defaults: { language: "any", quality: "any", subtitle: "any" },
});
assert.equal(availableWithAnyDefaults.defaults.language, "any");
assert.equal(availableWithAnyDefaults.defaults.quality, "any");
assert.equal(availableWithAnyDefaults.defaults.subtitle, "any");

let optionsRequestBody;
const aiAvailable = await buildAvailableAiPresetsWithAi(
  items,
  { DEEPSEEK_API_KEY: "secret", DEEPSEEK_MODEL: "deepseek-v4-flash" },
  async (url, options) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    assert.equal(options.headers.authorization, "Bearer secret");
    optionsRequestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              available: { language: ["zh-cn"], quality: ["1080p"], subtitle: ["subbed"], container: ["mkv"], codec: ["h264"] },
              counts: { language: { "zh-cn": 1 }, quality: { "1080p": 1 }, subtitle: { subbed: 1 }, container: { mkv: 2 }, codec: { h264: 1 } },
              defaults: { language: "zh-cn", quality: "1080p", subtitle: "subbed", container: "any", codec: "any", mode: "best_per_episode" },
              summary: "AI 识别到简体 1080p MKV。",
            }),
          },
        },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  },
);
assert.equal(optionsRequestBody.response_format.type, "json_object");
assert.equal(optionsRequestBody.messages[1].content.includes('"container"'), true);
assert.equal(optionsRequestBody.messages[1].content.includes('"terms"'), false);
assert.equal(optionsRequestBody.messages[1].content.includes('"direct_format"'), true);
assert.equal(optionsRequestBody.messages[1].content.includes("recommended defaults"), true);
assert.equal(aiAvailable.source, "ai");
assert.equal(aiAvailable.options.language[0].id, "zh-cn");
assert.equal(aiAvailable.options.container.find((option) => option.id === "mkv").count, 2);

await assert.rejects(
  () => selectItemsWithAi(items, {}, {}),
  (error) => error instanceof AiSelectionError && error.status === 503 && error.code === "deepseek_key_missing",
);

const selectionItems = [
  {
    hash: "ep08a",
    title: "[Group] Show 08 [1080p][简体]",
    filename: "Show.08.1080p.CHS.mkv",
    magnet: "magnet:?xt=urn:btih:ep08a&dn=Show.08.1080p.CHS.mkv",
    feed_url: "https://example.test/feed.xml",
  },
  {
    hash: "ep08v2",
    title: "[Group] Show 08 [1080p][简体][v2]",
    filename: "Show.08.v2.1080p.CHS.mkv",
    magnet: "magnet:?xt=urn:btih:ep08v2&dn=Show.08.v2.1080p.CHS.mkv",
    feed_url: "https://example.test/feed.xml",
  },
  {
    hash: "ep09",
    title: "[Group] Show 09 [1080p][简体]",
    filename: "Show.09.1080p.CHS.mkv",
    magnet: "magnet:?xt=urn:btih:ep09&dn=Show.09.1080p.CHS.mkv",
    feed_url: "https://example.test/feed.xml",
  },
];
const selectionRequestBodies = [];
const result = await selectItemsWithAi(
  selectionItems,
  { language: "zh-cn", quality: "1080p", mode: "best_per_episode" },
  { DEEPSEEK_API_KEY: "secret", DEEPSEEK_MODEL: "deepseek-v4-flash" },
  async (url, options) => {
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    assert.equal(options.headers.authorization, "Bearer secret");
    const body = JSON.parse(options.body);
    selectionRequestBodies.push(body);
    const callIndex = selectionRequestBodies.length;
    if (callIndex === 1) {
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                episodes: [
                  { episode_key: "08", label: "第 08 集", candidate_hashes: ["ep08a", "ep08v2"] },
                  { episode_key: "09", label: "第 09 集", candidate_hashes: ["ep09"] },
                ],
                skipped_hashes: [],
                summary: "总览到第 08、09 集。",
              }),
            },
          },
        ],
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (callIndex === 2) {
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                selected_hashes: ["ep08v2", "ep08a"],
                rejected: [{ hash: "ep08a", reason: "有 v2，原版不保留" }],
                summary: "第 08 集选择 v2。",
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
              selected_hashes: ["ep09"],
              rejected: [],
              summary: "第 09 集选择唯一版本。",
            }),
          },
        },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } });
  },
);

assert.equal(selectionRequestBodies.length, 3);
assert.equal(selectionRequestBodies[0].response_format.type, "json_object");
assert.equal(selectionRequestBodies[0].model, "deepseek-v4-flash");
assert.equal(selectionRequestBodies[0].messages[1].content.includes("episode overview"), true);
assert.equal(selectionRequestBodies[1].messages[1].content.includes("ep08v2"), true);
assert.equal(selectionRequestBodies[1].messages[1].content.includes("ep09"), false);
assert.equal(selectionRequestBodies[2].messages[1].content.includes("ep09"), true);
assert.equal(selectionRequestBodies[2].messages[1].content.includes("ep08v2"), false);
assert.equal(selectionRequestBodies[1].messages[1].content.includes('"terms"'), false);
assert.equal(selectionRequestBodies[1].messages[1].content.includes('"direct_format"'), true);
assert.equal(result.count, 2);
assert.deepEqual(result.selected_items.map((item) => item.hash), ["ep08v2", "ep09"]);
assert.equal(result.rejected.some((entry) => entry.hash === "ep08a"), true);
assert.equal(result.episode_plan.source, "ai_overview_then_per_episode");
assert.deepEqual(result.episode_plan.episodes.map((episode) => episode.episode_key), ["08", "09"]);

console.log("ai selector tests passed");
