# Time Stranger Evolution Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `time_stranger.html`, a readable dependency-free offline application for searching all 475 Time Stranger Digimon and exploring every reachable evolution ancestor and descendant.

**Architecture:** Keep the release application in one HTML file. Embed records and directed edges as JSON, build forward and reverse adjacency maps once, then render normal HTML nodes over an SVG edge layer. Keep a small Node test outside the release artifact to validate embedded data and pure graph/search functions.

**Tech Stack:** HTML5, CSS, browser JavaScript, SVG, Node.js built-in test runner; no runtime libraries and no network dependency.

## Global Constraints

- The release file is named exactly `time_stranger.html`.
- Include Field Guide IDs 001-475, including DLC entries 452-475.
- Required data is embedded; the complete workflow works from `file://` with no network.
- Support Simplified Chinese and English names and UI labels.
- Search matches number, Chinese name, or English name regardless of active language.
- Show every reachable ancestor and descendant of the selected Digimon.
- Use a sparse edge list plus derived forward and reverse adjacency maps.
- Exclude evolution requirements, stats, tracking, path planning, editing, portraits, graph zoom, and drag-to-pan.
- Keep code direct and readable; do not add a framework, build system, generic graph abstraction, or speculative configuration.

---

## File map

- Create `time_stranger.html`: embedded dataset, styles, HTML shell, graph/search logic, and SVG rendering.
- Create `test/dev/time_stranger.test.mjs`: data-integrity and pure-function tests; it is development-only and not needed to run the application.
- Modify `task_plan.md`, `findings.md`, and `progress.md`: research and execution record only.

### Task 1: Establish the embedded data contract and failing integrity tests

**Files:**
- Create: `time_stranger.html`
- Create: `test/dev/time_stranger.test.mjs`

**Interfaces:**
- Consumes: none.
- Produces: `<script id="digimon-data" type="application/json">` containing `{ digimon, edges }`; `globalThis.TimeStranger` containing `buildIndexes`, `collectRelated`, and `matchesQuery`.

- [ ] **Step 1: Write the test harness before application logic**

Create a Node test that reads the HTML, parses the JSON script, evaluates the application script without a DOM, and asserts the data contract:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const html = readFileSync(new URL("../../time_stranger.html", import.meta.url), "utf8");

function scriptText(id) {
  const match = html.match(new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `missing script #${id}`);
  return match[1];
}

const data = JSON.parse(scriptText("digimon-data"));
const context = { globalThis: {} };
vm.runInNewContext(scriptText("app"), context);
const api = context.globalThis.TimeStranger;

test("contains a complete bilingual field guide", () => {
  assert.equal(data.digimon.length, 475);
  assert.deepEqual([...data.digimon.map(({ id }) => id)].sort((a, b) => a - b),
    Array.from({ length: 475 }, (_, index) => index + 1));
  assert.ok(data.digimon.every(({ zh, en, stage }) => zh && en && stage));
});

test("contains only unique valid directed edges", () => {
  const ids = new Set(data.digimon.map(({ id }) => id));
  const keys = data.edges.map(([from, to]) => `${from}:${to}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(data.edges.every(([from, to]) => ids.has(from) && ids.has(to) && from !== to));
});
```

- [ ] **Step 2: Run the test and verify the contract fails**

Run: `node --test test/dev/time_stranger.test.mjs`

Expected: FAIL because `time_stranger.html` or its required scripts do not exist.

- [ ] **Step 3: Add the smallest valid HTML shell and script contracts**

Create the semantic shell (`aside`, search input, list, `main`, graph canvas), a data script containing empty arrays, and an application script exporting stub-free pure functions. Guard browser startup with `if (typeof document !== "undefined")` so Node can evaluate the pure functions.

```js
function buildIndexes({ digimon, edges }) {
  const byId = new Map(digimon.map(item => [item.id, item]));
  const next = new Map(digimon.map(item => [item.id, []]));
  const previous = new Map(digimon.map(item => [item.id, []]));
  for (const [from, to] of edges) {
    next.get(from).push(to);
    previous.get(to).push(from);
  }
  return { byId, next, previous };
}
```

- [ ] **Step 4: Run syntax and contract tests**

Run: `node --test test/dev/time_stranger.test.mjs`

Expected: the harness loads both scripts; completeness tests still FAIL because the dataset is empty, proving the red test is aimed at missing data rather than broken parsing.

### Task 2: Build and validate the complete dataset

**Files:**
- Modify: `time_stranger.html`
- Modify: `test/dev/time_stranger.test.mjs`

**Interfaces:**
- Consumes: `{ digimon, edges }` contract from Task 1.
- Produces: 475 unique records ordered by `id`, with `stage` keys `inTraining1`, `inTraining2`, `rookie`, `champion`, `ultimate`, `mega`, `megaPlus`, `armor`, or `hybrid`; unique `[fromId, toId]` relations.

- [ ] **Step 1: Extract and cross-check current source data**

Use the GameFAQs Field Guide as the numbering/English-name reference, Game8's chart as the primary relation source, and a current Chinese guide plus canonical Chinese Digimon names as the Simplified Chinese mapping. Record URLs, retrieval date, base/DLC split, and any corrected discrepancies in `findings.md`. Do not copy descriptions, images, or presentation markup.

- [ ] **Step 2: Add representative traversal and bilingual-search tests before the data**

```js
test("Agumon includes its baby ancestry and evolution descendants", () => {
  const indexes = api.buildIndexes(data);
  const agumon = data.digimon.find(item => item.en === "Agumon");
  const related = api.collectRelated(agumon.id, indexes);
  const names = new Set([...related].map(id => indexes.byId.get(id).en));
  assert.ok(names.has("Botamon"));
  assert.ok(names.has("Koromon"));
  assert.ok(names.has("Greymon"));
});

test("search is bilingual and number-aware", () => {
  const agumon = data.digimon.find(item => item.en === "Agumon");
  assert.ok(api.matchesQuery(agumon, "agumon"));
  assert.ok(api.matchesQuery(agumon, "亚古兽"));
  assert.ok(api.matchesQuery(agumon, String(agumon.id).padStart(3, "0")));
});
```

- [ ] **Step 3: Embed all records and sparse edges**

Keep one record and one edge per line where practical so corrections remain reviewable. Preserve official Field Guide IDs. Use factual names and relations only, and add a short source snapshot comment immediately above the data script.

- [ ] **Step 4: Run integrity and representative behavior tests**

Run: `node --test test/dev/time_stranger.test.mjs`

Expected: all completeness, uniqueness, endpoint, Agumon traversal, and bilingual-search tests PASS.

- [ ] **Step 5: Review the data diff for accidental prose or URLs**

Run: `rg -n "https?://|description|requirement|image" time_stranger.html`

Expected: only the short source comment may contain source URLs; no descriptions, requirements, or image URLs are embedded.

### Task 3: Implement the focused graph and list interactions

**Files:**
- Modify: `time_stranger.html`
- Modify: `test/dev/time_stranger.test.mjs`

**Interfaces:**
- Consumes: validated `digimon`, `edges`, and `buildIndexes`.
- Produces: `collectRelated(selectedId, indexes) -> Set<number>` and `matchesQuery(digimon, query) -> boolean`; browser functions `renderList`, `renderGraph`, `drawEdges`, `selectDigimon`, and `setLanguage`.

- [ ] **Step 1: Add pure-function tests for traversal boundaries**

Add a miniature graph fixture that proves traversal follows both incoming and outgoing edges, does not include unrelated nodes, and terminates when nodes merge:

```js
test("collectRelated returns only reachable ancestors and descendants", () => {
  const fixture = {
    digimon: [1, 2, 3, 4, 5].map(id => ({ id, zh: `${id}`, en: `${id}`, stage: "rookie" })),
    edges: [[1, 2], [2, 3], [1, 4]]
  };
  const result = [...api.collectRelated(2, api.buildIndexes(fixture))].sort();
  assert.deepEqual(result, [1, 2, 3]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-name-pattern="collectRelated" test/dev/time_stranger.test.mjs`

Expected: FAIL until `collectRelated` implements traversal.

- [ ] **Step 3: Implement direct pure graph/search functions**

Use an iterative stack with a visited set for each direction. Avoid a graph class or recursive abstraction:

```js
function walk(start, adjacency, found) {
  const pending = [...adjacency.get(start)];
  while (pending.length) {
    const id = pending.pop();
    if (found.has(id)) continue;
    found.add(id);
    pending.push(...adjacency.get(id));
  }
}

function collectRelated(selectedId, { next, previous }) {
  const found = new Set([selectedId]);
  walk(selectedId, previous, found);
  walk(selectedId, next, found);
  return found;
}
```

`matchesQuery` lowercases English, compares Chinese directly, removes surrounding whitespace, and matches both raw and three-digit IDs.

- [ ] **Step 4: Implement DOM state and list behavior**

Parse the embedded JSON once. Keep only `selectedId`, `language`, and `searchQuery`. Render list rows as buttons, retain the selection while filtering, select Agumon on initial load, and use a localized empty result row.

- [ ] **Step 5: Implement layered graph layout and SVG arrows**

Group related records by the fixed stage order, stack nodes inside stage columns, and render only columns containing a related record. After the DOM lays out, measure node centers and draw one cubic SVG path per visible edge with a marker arrowhead. Clicking a graph node calls the same `selectDigimon` used by the list.

- [ ] **Step 6: Run all pure tests**

Run: `node --test test/dev/time_stranger.test.mjs`

Expected: all tests PASS.

### Task 4: Style, accessibility, and browser/offline verification

**Files:**
- Modify: `time_stranger.html`
- Modify: `task_plan.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: complete interactive HTML from Task 3.
- Produces: finished responsive release file and recorded verification evidence.

- [ ] **Step 1: Add the restrained responsive styles**

Use CSS custom properties for the neutral palette and one blue accent. Desktop uses a 300-pixel sidebar and flexible graph area; at widths below 720 pixels switch to a fixed-height top list and graph below. Provide visible focus styles, selected/direct-neighbor variants, compact typography, and native graph overflow.

- [ ] **Step 2: Open from `file://` and verify the primary workflow**

Open the absolute `time_stranger.html` file in the in-app browser. Verify initial Agumon selection, search for `亚古兽`, `Agumon`, and its three-digit ID, click a list row, click a graph node, switch both languages, and confirm an unmatched query shows the empty state.

- [ ] **Step 3: Verify desktop and narrow layouts visually**

Capture desktop and mobile-sized screenshots. Inspect that controls are reachable, names do not overlap, arrows remain behind nodes, stage columns remain readable, and oversized graphs scroll instead of clipping.

- [ ] **Step 4: Verify offline behavior and final data checks**

Run:

```bash
node --test test/dev/time_stranger.test.mjs
git diff --check
```

Expected: all tests PASS and `git diff --check` prints no errors. Reload the `file://` page with network disabled; the same workflow remains functional.

- [ ] **Step 5: Record completion without unrelated cleanup**

Update the three planning files with sources, test output, browser viewport sizes, and any honest verification boundary. Review `git diff --stat` and `git diff -- time_stranger.html test/dev/time_stranger.test.mjs` to ensure every changed line serves this application.
