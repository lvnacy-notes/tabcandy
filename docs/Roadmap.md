This doc tracks where Tab Candy is headed. It's a working plan, not a promise — order and scope shift as things get built, get harder than expected, or stop mattering.

## Contents

```toc
```

## Status at a glance
---

- **v1.0 — Shipped.** Tab Candy is live in Obsidian's community plugin browser.
- **v1.1 — Shipped.** Markdown-based `fileQuotes` (vault-synced blockquote file, additive alongside manual custom quotes) is live.
- **v1.2 — Not started.** Scoped below. Uses the Style Settings community plugin for color customization.
- **v2.0 — Not started.** Scoped below. A major version because it's a settings-shape change with a migration, not just a new setting, and it leans on v1.2's color variables for section-level theming.

## v1.0 — Stabilize what's shipped
---

The listing is live, but a couple of loose ends from getting there are still open:

- [x] **Fix the `versionCheck.ts` manifest URL bug.** The stable/beta manifest URLs point at `github.com/lvnacy-notes/tab-candy` (with a dash); the actual repo is `lvnacy-notes/tabcandy` (no dash). This 404s silently — update notices just never fire in production until it's fixed.
- [x] **Accessibility pass on the settings tab and new-tab view.** ARIA labels, keyboard nav for both search entry points.

## v1.1 — Quotes
---

- [x] Ship the markdown blockquote-based `fileQuotes` source (`src/services/quotes.ts`), synced from a vault file the same way `backgroundsFolder` is synced from a folder. Lives alongside manually-entered `customQuotes`, not in place of them.
- [x] Markdown import/export for the manually-entered custom quotes list, for backup/sharing.

## v1.2 — Style customization
---

Uses [Style Settings](https://github.com/community-archive/obsidian-style-settings) — the de facto standard for theme/plugin color customization in Obsidian, already installed by a large share of the userbase and already trusted by hundreds of themes and plugins to render a color-picker UI and inject the resulting CSS variables. Tab Candy defines a small, fixed set of `variable-color` settings of its own choosing; Style Settings owns the picker UI, persistence, and injection. Style Settings only — no separate native Tab Candy color picker, since anyone who wants to tune colors is likely to already have it installed, the same way many already do for theme customization.

- [ ] **Ship a `/* @settings */` block in Tab Candy's own compiled `styles.css`**, defining `variable-color` entries for the palette bits worth exposing. Grounded in what's actually hardcoded in `App.scss` today: the root text color (`#dadada`), and the search-pill/recent-files-wrapper background (`rgba(255, 255, 255, 0.1)`, currently duplicated in two places) are the clearest starting candidates. The background overlay should use an `alt-format` to also emit an `-rgb` (or `-hsl`) triplet, since it's consumed with alpha via `rgba()`, not as a flat color.
- [ ] **Consume `var(--tabcandy-*, <fallback>)` throughout `App.scss`** instead of the hardcoded values, so Tab Candy looks exactly as it does today for anyone without Style Settings installed, and picks up live edits the moment someone who *does* have it changes a value — no reload, no Tab Candy code in the loop once the variable's wired up.
- [ ] **Call `app.workspace.trigger('parse-style-settings')` on load**, per Style Settings' documented plugin-support contract, so it notices Tab Candy's settings block (and re-notices it after a Tab Candy update changes what's in it).

## v1.3 — Navigation, Tab Identity & Grouping
---

**Navigation sugar Obsidian doesn't ship**
- `iterateAllLeaves()`/`iterateRootLeaves()` as the primitive behind "close all except this one," "close tabs matching a folder," or a fuzzy search scoped to *currently open* tabs (distinct from the quick switcher, which searches every file whether it's open or not).
- A "recently closed tabs" stack — no browser-style Ctrl+Shift+T exists in core Obsidian. `'layout-change'` plus a small in-memory ring buffer of closed leaf states gets most of the way there. Small and self-contained enough to not need to wait on v2.0 - could slot into the current fixed layout the same way Recent Files does today.

**Tab identity & grouping**
Group-based tab coloring (`setGroup`'s color dot) could become a themeable variable exposed by v1.2's color system, instead of Obsidian's fixed palette.

- Programmatic pin/unpin (`leaf.setPinned()`/`togglePinned()`) — an automation like "always pin the daily note" or "pin these N project notes," rather than requiring the user to right-click each one by hand.
- Obsidian's linked-pane groups (`leaf.setGroup()`/`setGroupMember()`, `workspace.getGroupLeaves()`) — the colored-dot mechanism behind "these panes follow the same file." Mostly unused for anything beyond that one built-in case; a real primitive for "these tabs move together" if a use case shows up.
- React to `'pinned-change'`/`'group-change'` events directly instead of polling leaf state.

## v2.0 — Composable dashboard
---

Everything the new tab view shows today — the top-left search button, time, greeting, inline search, recent files, bookmarks, quote — is a fixed set of elements in a fixed layout, each independently toggled on or off. This turns that into an ordered list of sections the user can add, remove, and reorder, where today's elements become the first batch of built-in section types alongside a new custom type.

- [ ] **Model sections as data, not JSX.** Replace the current flat per-element booleans (`showTime`, `showGreeting`, `showRecentFiles`, ...) with an ordered `sections: DashboardSection[]` list in settings, each with a `type` (`'time' | 'greeting' | 'recentFiles' | 'bookmarks' | 'quote' | 'search' | 'custom'`) and type-specific config. `App.tsx` renders the list instead of a fixed JSX tree of conditionals.
- [ ] **Settings migration.** Existing installs have `showTime`/`showGreeting`/etc., not a `sections` array — `normalizeSettings.ts` needs a migration step (bumping `settingsVersion`, same as every prior shape change) that synthesizes a `sections` list from the old booleans so nobody's new tab goes blank on upgrade.
- [ ] **Custom sections point at a note, not a settings text box.** A custom section's content lives in a vault note (optionally a specific heading or block inside it) — the same "point Tab Candy at something in the vault" pattern as `backgroundsFolder` and `quotesFilePath` — rather than storing markdown inline in `data.json`. Editing a note gets the user Obsidian's actual editor: syntax highlighting, Dataview's own autocomplete, live preview — none of which a settings textarea can offer.
- [ ] **Render through Obsidian's real markdown pipeline, not a custom one.** `MarkdownRenderer.render()` against the note's content is what makes Dataview queries, Mermaid diagrams, and task lists "just work" for free — Mermaid is native to Obsidian's renderer, and Dataview (or any other plugin that registers a code-block processor) runs the same way it would in a normal note. Tab Candy doesn't need to know what a `dataview` code block is; it only needs to hand the content to the renderer Obsidian already ships.
- [ ] **Lifecycle, not just rendering.** `MarkdownRenderer.render()` needs an owning `Component` so registered post-processors (Dataview's live queries, in particular) can clean themselves up. Tab Candy's view needs to create and `unload()` that component alongside its own `onOpen()`/`onClose()`, the same care already taken with `EventRef`s in `quotes.ts` and `backgrounds.ts` — a dangling live query on every new-tab open/close is a slow leak, not a crash, so it'd be easy to ship unnoticed.
- [ ] **Reordering UI.** Some way to add a section, remove one, and change order, in the settings tab — drag handles if the declarative `Setting` API supports them cleanly, up/down buttons otherwise. Scope this after the data model and rendering land; it's the part users touch most, but it's the least risky part to get wrong.
- [ ] **Built-in section config carries over.** Each built-in type keeps whatever configuration it has today (bookmark source/group, time format, greeting text, search provider) as that section's `type`-specific config — this is a reshaping of existing settings, not a loss of any.

## v2.1 — Layouts & Workspace Enhancements
---

**Layout & splits**
Saved-workspace launch tiles and a recently-closed-tabs widget are both plausible v2.0 built-in section types once sections are data instead of fixed JSX.

- `createLeafBySplit()` — split panes programmatically instead of requiring a drag.
- Saved layout snapshots (what the core Workspaces plugin does under the hood) — capture an entire tab/split/group arrangement and restore it later. Candidate: quick-launch tiles on the new tab dashboard ("Project X" / "Journal" / "Research") that call `changeLayout()` against a saved arrangement. Reads naturally as a v2.0 built-in section type once sections are composable — a launcher, not a content widget.


## Brainstorm — raw ideas, not yet scoped
---

Not committed to a version, not ordered by priority — just Obsidian tab/workspace API capabilities worth having on hand the next time this doc gets revisited, so a good idea doesn't have to get rediscovered from scratch. Move an item out of this section and into a real version once it's actually going to get built.

**Windows & popouts**
- `workspace.openPopoutLeaf()`/`moveLeafToPopout()` — pop a leaf out into its own real OS window (desktop only). A "pop this out to its own window" action is close to a one-liner given the API already exists.