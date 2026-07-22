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
  assert.ok(data.digimon.every(({ zh, en, stage, image, attribute, type }) => (
    zh && en && stage && attribute && type && image.startsWith("https://")
  )));
});

test("contains the verified attributes and species types", () => {
  const { data } = loadApp();
  const byId = new Map(data.digimon.map(item => [item.id, item]));

  assert.equal(byId.get(1).attribute, "noData");
  assert.equal(byId.get(1).type, "unidentified");
  assert.equal(byId.get(21).attribute, "vaccine");
  assert.equal(byId.get(21).type, "reptile");
  assert.equal(byId.get(300).attribute, "free");
  assert.equal(byId.get(300).type, "mutant");
  assert.equal(byId.get(463).attribute, "vaccine");
  assert.equal(byId.get(463).type, "holyKnight");
  assert.equal(byId.get(466).attribute, "virus");
  assert.equal(byId.get(466).type, "holyKnight");
});

test("formats field guide metadata in Chinese and English", () => {
  const { api } = loadApp();

  assert.equal(api.formatProfile({ attribute: "vaccine", type: "bird" }, "zh"), "疫苗种 · 鸟型");
  assert.equal(api.formatProfile({ attribute: "vaccine", type: "bird" }, "en"), "Vaccine · Bird");
  assert.equal(api.formatProfile({ attribute: "noData", type: "holyKnight" }, "zh"), "无数据种 · 圣骑士型");
  assert.equal(api.formatProfile({ attribute: "noData", type: "holyKnight" }, "en"), "No Data · Holy Knight");
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

test("contains complete combat records and valid skill references", () => {
  const { data } = loadApp();
  const fieldIds = new Set(data.digimon.map(({ id }) => id));
  const combatIds = data.combat.map(({ id }) => id).sort((a, b) => a - b);

  assert.equal(data.combat.length, 475);
  assert.deepEqual(combatIds, Array.from({ length: 475 }, (_, index) => index + 1));
  assert.ok(data.combat.every(({ id, resistances, skills }) => (
    fieldIds.has(id)
    && resistances.length === 11
    && resistances.every(code => Number.isInteger(code) && code >= 0 && code <= 4)
    && skills.length >= 1
    && skills.every(skillId => data.skills[skillId]?.name?.en && data.skills[skillId]?.effect?.en)
  )));
});

test("matches verified Agumon and DLC3 combat samples", () => {
  const { data } = loadApp();
  const combat = new Map(data.combat.map(item => [item.id, item]));

  assert.deepEqual(combat.get(21).resistances, [0, 3, 0, 0, 1, 1, 3, 0, 0, 0, 0]);
  assert.ok(combat.get(21).skills.includes("20501"));
  assert.equal(data.skills["20501"].name.en, "Pepper Breath");
  assert.deepEqual(combat.get(467).resistances, [0, 3, 0, 0, 3, 0, 1, 3, 1, 0, 0]);
  assert.deepEqual(combat.get(467).skills, ["dlc3-467-1", "dlc3-467-2"]);
  assert.equal(data.skills["dlc3-467-2"].name.en, "All Delete");
  assert.equal(data.skills["dlc3-467-2"].sp, 260);
});

test("contains one structured requirement record for every Digimon", () => {
  const { data } = loadApp();
  assert.ok(Array.isArray(data.requirements), "requirements should be an array");

  const ids = data.requirements.map(({ id }) => id).sort((a, b) => a - b);
  assert.equal(data.requirements.length, 475);
  assert.deepEqual(ids, Array.from({ length: 475 }, (_, index) => index + 1));

  const byId = new Map(data.requirements.map(item => [item.id, item]));
  assert.deepEqual(byId.get(1), { id: 1 });
  assert.deepEqual(byId.get(84), { id: 84, rank: 3, stats: { sp: 730, int: 540 } });
  assert.deepEqual(byId.get(300), {
    id: 300,
    rank: 5,
    dna: [
      { id: 174, personality: "overprotective" },
      { id: 84, personality: "enlightened" },
    ],
  });
  assert.deepEqual(byId.get(190), { id: 190, items: ["beastFire"], modeFrom: [187] });
  assert.deepEqual(byId.get(305), { id: 305, rank: 5, items: ["beastFire"] });
  assert.deepEqual(byId.get(463), { id: 463, rank: 7, modeFrom: [309] });
});

test("formats normal and special requirements in Chinese and English", () => {
  const { data, api } = loadApp();
  const digimonById = new Map(data.digimon.map(item => [item.id, item]));
  const requirements = new Map(data.requirements.map(item => [item.id, item]));

  assert.deepEqual(
    [...api.formatRequirements(requirements.get(1), "zh", digimonById)],
    ["无法通过进化获得"],
  );
  assert.deepEqual(
    [...api.formatRequirements(requirements.get(84), "zh", digimonById)],
    ["探员阶级 3 以上", "最大 SP 730 以上", "智力 540 以上"],
  );
  assert.deepEqual(
    [...api.formatRequirements(requirements.get(84), "en", digimonById)],
    ["Agent Rank 3 or higher", "Max SP 730 or higher", "INT 540 or higher"],
  );
  assert.deepEqual(
    [...api.formatRequirements(requirements.get(300), "zh", digimonById)],
    ["探员阶级 5 以上", "DNA进化：甲龙兽（过度保护）＋天使兽（开明）"],
  );
  assert.deepEqual(
    [...api.formatRequirements(requirements.get(463), "en", digimonById)],
    ["Agent Rank 7 or higher", "Mode Change: UlforceVeedramon"],
  );
  assert.deepEqual(
    [...api.formatRequirements(requirements.get(464), "zh", digimonById)],
    ["探员阶级 7 以上", "需要道具：奇迹装甲", "形态转换：金甲龙兽"],
  );
  assert.deepEqual(
    [...api.formatRequirements(requirements.get(449), "en", digimonById)],
    ["Agent Rank 8 or higher", "ATK 3630 or higher", "Bonds of Valor Agent Skills 46 or more"],
  );
});

test("exposes requirement details for hover, focus, and click", () => {
  const html = readFileSync(htmlUrl, "utf8");
  assert.match(html, /id="selected-requirements"/);
  assert.match(html, /className = "condition-tooltip"/);
  assert.match(html, /className = "profile-meta"/);
  assert.match(html, /aria-describedby/);
});

test("uses a responsive boundary arrow for the sidebar", () => {
  const html = readFileSync(htmlUrl, "utf8");

  assert.match(html, /<\/aside>\s*<button id="sidebar-toggle"/);
  assert.match(html, /class="sidebar-toggle-arrow"/);
  assert.match(html, /\.app\.sidebar-collapsed \.sidebar-toggle/);
  assert.match(html, /@media \(max-width: 720px\)[\s\S]*\.sidebar-toggle-arrow/);
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
