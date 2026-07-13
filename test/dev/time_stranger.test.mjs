import assert from "node:assert/strict";
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
