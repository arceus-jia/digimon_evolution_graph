# Findings

## Repository
- Branch `main` contains only `.gitignore` plus Git metadata.
- Latest commit: `65af22f Initial commit`.
- There is no existing app structure or UI convention to preserve.

## Research
- Multiple public sites expose complete or near-complete Time Stranger rosters and evolution relations.
- Search results currently disagree on scope: 451 base-game Digimon versus 475 including DLC/updates. The app must define which roster snapshot it targets.
- Game8 publishes a complete evolution-chart guide; Raider King has an existing focusable interactive evolution chart; DigimonWiki/Wikimon list the roster; community compendia reportedly include evolution requirements and images.
- Chinese guides exist (for example GamerSky), but a clean downloadable bilingual dataset has not yet been confirmed.
- Search results are evidence of availability, not yet permission or a stable machine-readable source. We should prefer extracting factual relations into our own compact schema and document the source/version rather than hotlinking a third-party app's private data endpoint.
- GameFAQs explicitly divides the field guide into IDs 001-451 for the base game and 452-475 for DLC, which gives a concrete numbering snapshot.
- Game8's chart was updated March 11, 2026 for DLC Episode Pack 3 and exposes per-ID de-digivolution/digivolution relations in page content, making it a strong relation cross-check.
- Raider King's existing interaction validates the proposed focus model: search/click a Digimon, then isolate all ancestors and descendants; hover can highlight only direct neighbors.
- The community compendium includes English names, pictures, outgoing evolutions, and evolution requirements, but Chinese translations still need a separate source or curated mapping.

## Design notes
- An `N x N` adjacency matrix is conceptually valid but wasteful for a sparse evolution graph. An edge list plus forward/reverse adjacency maps is the likely simpler representation; confirm after roster size and source shape are known.
- User approved `time_stranger.html` as the version-specific filename.
- Selected a sparse edge list, HTML text nodes, and an SVG arrow layer. Native scrolling is sufficient for the MVP; pan/zoom is excluded.
- MVP dataset is all 475 entries including DLC. It includes names, stages, and relations but not requirements, stats, tracking, or portraits.
- Exact visual inventory: true white `#fff` canvas, pale gray sidebar, dark system-font text, one blue accent, 300 px desktop sidebar, thin separators, no decorative imagery, no gradients, no badges, no card grid, and no icons except SVG arrowheads.
- Allowed primary copy is limited to the Time Stranger title, dataset count, search label/placeholder, language control, localized stage labels, selected Digimon heading, and empty-result text.
- The user asked for code that is concise, understandable, and avoids an AI-generated aesthetic; this is treated as an explicit opt-out from image-generated visual concepting and decorative assets.
- Direct page downloads are protected: the first Game8/GameFAQs `curl` attempt did not yield usable HTML. GamerSky returned about 60 KB and still needs encoding/content inspection.
- A browser-like user agent retrieved the full Game8 chart. Its main table has exactly 475 numbered rows, unique English names, 1,116 outgoing relations, and 1,086 incoming relations.
- Comparing both directions reveals 35 outgoing-only and 5 incoming-only relations; most outgoing-only items are reversible mode/form changes or late DLC links. One incoming-only item is an invalid self-link (`Omnimon Zwart Defeat -> itself`) and must be excluded.
- The Simplified Chinese Digimon Fandom page exposes numbered Chinese names and outgoing relations as structured text, including `001 水母兽`, `006 黑球兽`, `009 滚球兽`, and `021 亚古兽`. It is useful as a broad mapping/cross-check, but the page is labeled unfinished and community naming may differ from the game's official Simplified Chinese localization.
- GamerSky has separate numbered Field Guide articles whose navigation text lists official-looking Chinese names by ID (for example 001-050); these are preferable for the base-game Chinese mapping if all ranges can be located.
- GamerSky provides eight range articles covering IDs 001-400. Their navigation yielded 397 unique mappings; IDs 284, 349, and 364 were missed by the initial hyphen-based parser because their display names contain punctuation that needs separate handling.
- The Fandom MediaWiki API works even though the normal page returns 403. Parsing page ID 23419 with `variant=zh-hans` yields structured Simplified Chinese HTML for IDs 001-451.
- GamerSky and Fandom differ on 61 of the 397 overlapping mappings. GamerSky uses the names shown in its numbered game guide (for example `201 飞行V龙兽`, `234 奥米加咆哮兽`), while Fandom often uses broader franchise/community names (for example `天翔V龙兽`, `奥米加高吼兽`). Use GamerSky for IDs 001-400 and Fandom only for gaps/401-451 so the app stays closer to the game's displayed localization.
- Game8's DLC rows are IDs 452-475. The Fandom roster also contains them, but its IDs use a `(DLC)` suffix that the initial exact-three-digit parser skipped.
- Final embedded snapshot contains 475 records and 1,120 unique directed relations. The edge set is the union of Game8 outgoing and valid incoming relations, excluding one invalid self-link.

## Fidelity ledger
- Copy: only the approved title, count, search, language, selected record, stage labels, and empty result are visible; no invented badges or helper prose.
- Layout: desktop is a 300 px sidebar plus scrollable graph; mobile is a 300 px list above a scrollable graph.
- Typography: system UI fonts with explicit sizes for headers, controls, list rows, stages, and graph nodes; no browser-default control sizing remains.
- Palette: true white graph canvas, pale neutral sidebar, dark text, thin gray separators, and one blue selection/direct-edge accent; no gradients or decorative imagery.
- Container model: flat list and open graph canvas; no card grid or nested dashboard panels.
- Responsive behavior: at 390 x 844 the app width equals the viewport, the selected node is centered at x=113..277, and graph overflow remains scrollable.
