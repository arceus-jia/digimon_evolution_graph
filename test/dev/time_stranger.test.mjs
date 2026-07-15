import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const htmlUrl = new URL("../../time_stranger.html", import.meta.url);

test("release HTML exists", () => {
  assert.ok(existsSync(htmlUrl), "time_stranger.html should exist");
});

function loadApp() {
  const html = readFileSync(htmlUrl, "utf8");

  function scriptText(id) {
    const match = html.match(new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
    assert.ok(match, `missing script #${id}`);
    return match[1];
  }

  const data = JSON.parse(scriptText("digimon-data"));
  const context = { globalThis: {} };
  vm.runInNewContext(scriptText("app"), context);
  return { data, api: context.globalThis.TimeStranger };
}

test("contains a complete bilingual field guide", () => {
  if (!existsSync(htmlUrl)) return;
  const { data } = loadApp();
  const ids = data.digimon.map(({ id }) => id).sort((a, b) => a - b);

  assert.equal(data.digimon.length, 475);
  assert.deepEqual(ids, Array.from({ length: 475 }, (_, index) => index + 1));
  assert.ok(data.digimon.every(({ zh, en, stage, image }) => zh && en && stage && image.startsWith("https://")));
});

test("uses the Simplified Chinese names from Time Stranger", () => {
  const { data } = loadApp();
  const names = new Map(data.digimon.map(({ id, zh }) => [id, zh]));
  const expected = new Map([
    [2, "巧洛兽"],
    [4, "泡泡兽"],
    [5, "布尼兽"],
    [8, "卡普利兽"],
    [11, "犄角兽"],
    [15, "喵喵兽"],
    [26, "日轮兽"],
    [27, "梗犬兽"],
    [29, "玩具亚古兽"],
    [30, "梦貘兽"],
    [31, "雏鸡兽"],
    [33, "猎鹰兽"],
    [38, "龙蛇兽"],
    [41, "加奥兽"],
    [45, "小锹形虫兽"],
    [48, "高吼兽"],
    [54, "佛洛拉兽"],
    [451, "加布兽友情纽带"],
  ]);

  for (const [id, name] of expected) assert.equal(names.get(id), name, `unexpected Chinese name for ID ${id}`);
});

test("matches the complete verified Chinese name snapshot", () => {
  const { data } = loadApp();
  const corpus = data.digimon
    .map(({ id, zh }) => `${id}:${zh}\n`)
    .join("");
  const digest = createHash("sha256").update(corpus).digest("hex");

  assert.equal(digest, "3a56349edd9c358f4489a86652786d60186916a3ce9349ac7ba278ed1ad6c810");
});

test("uses the DLC names shown in the Simplified Chinese field guide", () => {
  const { data } = loadApp();
  const names = new Map(data.digimon.map(({ id, zh }) => [id, zh]));
  const expected = [
    "偃月加鲁鲁兽", "异次元兽", "电光暴龙兽", "奥米加兽Alter-B",
    "奥米加兽Alter-S", "奥米加兽兹瓦特:战损", "番长豆豆兽", "番长花仙兽",
    "番长魔像兽", "番长飞虫兽", "奥米加兽MM", "究极V龙兽（X抗体）",
    "金甲龙兽（X抗体）", "杰斯兽（X抗体）", "公爵兽（X抗体）", "奥米加兽（X抗体）",
  ];

  expected.forEach((name, index) => assert.equal(names.get(452 + index), name));
});

test("contains only unique valid directed edges", () => {
  if (!existsSync(htmlUrl)) return;
  const { data } = loadApp();
  const ids = new Set(data.digimon.map(({ id }) => id));
  const keys = data.edges.map(([from, to]) => `${from}:${to}`);

  assert.equal(new Set(keys).size, keys.length);
  assert.ok(data.edges.every(([from, to]) => ids.has(from) && ids.has(to) && from !== to));
});

test("Agumon includes its baby ancestry and evolution descendants", () => {
  const { data, api } = loadApp();
  const indexes = api.buildIndexes(data);
  const agumon = data.digimon.find(item => item.en === "Agumon");
  assert.ok(agumon, "Agumon should exist");

  const related = api.collectRelated(agumon.id, indexes);
  const names = new Set([...related].map(id => indexes.byId.get(id).en));
  assert.ok(names.has("Botamon"));
  assert.ok(names.has("Koromon"));
  assert.ok(names.has("Greymon"));
});

test("search is bilingual and number-aware", () => {
  const { data, api } = loadApp();
  const agumon = data.digimon.find(item => item.en === "Agumon");
  assert.ok(agumon, "Agumon should exist");

  assert.ok(api.matchesQuery(agumon, "agumon"));
  assert.ok(api.matchesQuery(agumon, "亚古兽"));
  assert.ok(api.matchesQuery(agumon, String(agumon.id).padStart(3, "0")));
});

test("a reversible form does not hide later descendants", () => {
  const { api } = loadApp();
  const fixture = {
    digimon: [1, 2, 3, 4].map(id => ({ id, zh: `${id}`, en: `${id}`, stage: "mega" })),
    edges: [[1, 2], [2, 1], [2, 3], [4, 3]],
  };

  const related = [...api.collectRelated(1, api.buildIndexes(fixture))].sort();
  assert.deepEqual(related, [1, 2, 3]);
});
