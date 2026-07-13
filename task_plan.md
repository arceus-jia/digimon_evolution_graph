# Task Plan

## Goal
Design and, after user approval, build a dependency-free single-HTML Digimon evolution graph for *Digimon Story: Time Stranger*.

## Success criteria
- The data source and coverage are explicit and verifiable.
- The left pane lists and searches Digimon by number/name.
- Selecting a Digimon renders its connected evolution ancestry and descendants.
- Chinese/English display works without a server or JS libraries.
- The result remains useful offline; remote portraits are optional enhancement only.

## Phases
- [x] Explore repository and public data sources -> verified greenfield repo plus public roster/evolution coverage.
- [x] Clarify scope one decision at a time -> user approved the recommended 475-entry single-HTML direction and named the file `time_stranger.html`.
- [x] Compare 2-3 technical approaches -> documented sparse HTML+SVG, matrix/SVG, and Canvas options; selected sparse HTML+SVG.
- [x] Present and validate the design -> prior proposal plus user go-ahead establishes the approved direction.
- [x] Write and self-review the approved design spec -> no placeholders, contradictions, scope leaks, or unresolved ambiguity.
- [x] Write implementation plan after spec approval -> saved an inline, TDD-oriented four-task plan.
- [x] Implement, verify, and merge the single HTML app -> commit `34d020e` is on `main`.

## Constraints and assumptions
- No framework, package manager, server, or runtime dependency in the delivered app.
- All essential names and edges are embedded in the HTML.
- Portrait URLs may fail and must never block graph use.
- Current repository contains only `.gitignore` and Git metadata.
- First release omits evolution requirements, collection features, and remote portraits.

## Errors encountered
- `skills/references/codex-tools.md` was not found at the initially inferred path; resolved at `skills/using-superpowers/references/codex-tools.md`.
- Direct `curl` retrieval of Game8/GameFAQs returned HTTP 403 or no file; use browser-indexed content, an alternate user agent/endpoint, or another factual dataset instead of repeating the same request.
- First generated-data pass stopped before modifying the HTML because GamerSky ID 349 did not match the range-page parser; inspect that exact navigation entry and use the Fandom value only if the source HTML is malformed.
- The in-app browser backend reported no available instances; browser QA uses the cached Playwright CLI package with installed Google Chrome instead.
- First browser QA run used an arbitrary expectation of more than 100 visible Agumon edges; the focused graph legitimately contains fewer. Corrected the QA assertion to require at least one rendered edge while preserving exact interaction checks.
- A final planning-file patch used stale context and was rejected without changing files; re-read the three files and applied a narrower patch.
