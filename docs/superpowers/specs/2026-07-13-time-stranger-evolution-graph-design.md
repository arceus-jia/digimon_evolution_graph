# Time Stranger Evolution Graph Design

## Goal

Create `time_stranger.html`, a dependency-free offline reference for all 475 Digimon in *Digimon Story: Time Stranger*, including DLC entries 452-475. The file must open directly in a modern browser without a server.

## Scope

The first release contains:

- Field Guide number, Simplified Chinese name, English name, and evolution stage for every Digimon.
- Directed evolution relations for the selected game version.
- A number-ordered searchable list.
- Chinese and English display modes.
- A focused graph containing every reachable ancestor and descendant of the selected Digimon.

The first release deliberately excludes evolution requirements, stats, collection tracking, path planning, editing, and mandatory portraits. Remote portraits are omitted because names are sufficient for the stated use case and hotlinked assets would make availability and licensing fragile.

## Considered approaches

### 1. Sparse edge list with HTML nodes and an SVG edge layer — selected

Store Digimon as records and relations as `[fromId, toId]` pairs. Build forward and reverse adjacency maps at startup. Render text nodes as regular HTML and arrows in a shared SVG layer.

This keeps the embedded data compact, makes text searchable and accessible, and avoids a graph library. It requires a small layout routine, but the graph is naturally layered by evolution stage.

### 2. Adjacency matrix with an SVG-only graph

This matches the initial `map[id1][id2]` idea, but 475 entries require 225,625 matrix positions even though almost all are zero. SVG-only text and controls also take more work to keep accessible. It offers no useful advantage for this sparse graph.

### 3. Canvas graph

Canvas handles very large drawings efficiently, but text selection, accessibility, hit testing, and responsive rendering become more complicated. With at most 475 records and a focused subgraph, that complexity is unnecessary.

## Data model

All essential data is embedded in one script block:

```js
const DIGIMON = [
  { id: 9, zh: "滚球兽", en: "Koromon", stage: "inTraining2" },
  { id: 21, zh: "亚古兽", en: "Agumon", stage: "rookie" }
];

const EDGES = [
  [9, 21]
];
```

`id` is the in-game Field Guide number and the stable internal key. Display numbers use three digits. Stage keys are internal constants translated by the UI dictionary.

At startup, the application derives:

- `byId`: Digimon record lookup.
- `evolvesTo`: outgoing adjacency list.
- `evolvesFrom`: incoming adjacency list.
- Normalized bilingual search strings.

The source snapshot is documented in an in-file comment. Relations are cross-checked against at least two current public guides. Startup validation rejects duplicate IDs, duplicate edges, and edges with unknown endpoints during development.

## Interface

The page is split into two regions on desktop.

### Left sidebar

- Compact title and dataset label: `Time Stranger · 475`.
- Chinese/English language switch.
- Search input matching number, Chinese name, or English name regardless of display language.
- Scrollable rows ordered by Field Guide number.
- The selected row has a clear background and left accent.

### Graph workspace

- A small heading shows the selected number and localized name.
- The graph flows left to right from earlier stages to later stages.
- Ancestors and descendants are found with iterative graph traversal; unrelated Digimon are omitted.
- Nodes are grouped into stage columns and stacked with stable spacing.
- The selected node is visually strongest; direct neighbors use a secondary highlight; other reachable nodes remain neutral.
- Clicking any graph node makes it the new selection and recalculates the focused graph.
- The graph region uses native two-axis scrolling when the focused graph is larger than the viewport.
- Arrow lines are drawn behind nodes and recalculated after layout or resize.

On narrow screens, the sidebar becomes a fixed-height top section and the graph remains scrollable underneath. No drag-to-pan or zoom controls are included in the first release.

## Data flow

1. Parse and validate embedded records and edges.
2. Build lookup and adjacency maps once.
3. Filter the left list whenever the search text changes.
4. On selection, traverse `evolvesFrom` and `evolvesTo` to collect all reachable ancestors and descendants.
5. Assign collected nodes to stage columns, render nodes, measure their positions, and render SVG arrows.
6. Re-render localized labels when the language changes without changing the selection or search meaning.

State is limited to `selectedId`, `language`, and `searchQuery`. No storage, network request, router, or server is required.

## Empty and failure states

- No search matches: show a localized “no results” row.
- No selected record: select the first matching record; on initial load select Agumon if present.
- A record with no incoming or outgoing relation: show that record as a one-node graph.
- Invalid embedded data: log the exact validation error; this is treated as a build-time defect rather than hidden at runtime.
- Offline mode has no special error state because all required content is embedded.

## Visual direction

Use a restrained reference-tool appearance rather than decorative game art: light neutral background, dark text, one blue accent, thin separators, compact list density, and readable graph nodes. The layout prioritizes fitting many names and tracing arrows over cards, gradients, shadows, or animation.

## Verification

- Data checks: exactly 475 unique IDs, every edge endpoint exists, and edges are unique.
- Traversal checks: representative baby, rookie, mega, isolated/special, and DLC selections produce correct ancestor/descendant sets.
- Agumon acceptance check: its graph includes Koromon/Botamon ancestry and every reachable outgoing branch present in the source data.
- Interaction checks: bilingual search, number search, list selection, graph-node selection, language switching, and empty search.
- Offline check: open the file via `file://` with network disabled and exercise the full workflow.
- Responsive check: desktop and narrow mobile-sized viewports have no inaccessible controls or clipped graph content.

