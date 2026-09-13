---
class: archive
category:
  - changelog
log-scope: general
modified: 2026-09-13
UUID: 78a2cf3d-030a-424e-a388-243df9868fe3
commit-sha: 
files-modified: 18
files-created: 6
files-archived: 1
tags:
  - tabcandy
---

# Tab Candy v1.2 Style Customization — 2026-09-13

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-09-13 |
| Commit SHA | [fill in after commit] |
| Files Added | 6 |
| Files Modified | 18 |
| Files Archived | 1 |

## Changes

### Files Modified
- `.obsidian/community-plugins.json`: [description]
- `.obsidian/workspace.json`: [description]
- `ARCHIVE/CHANGELOG-2026-09-11-8aa1e3c.md`: backfill prior changelog with commit hash
- `docs/Roadmap.md`: [description]
- `docs/Tab Candy Testing Specification.md`: [description]
- `docs/Tab Candy v1.2 Implementation Spec.md`: [description]
- `esbuild.config.js`: [description]
- `main.ts`: [description]
- `package.json`: removed Sass
- `pnpm-lock.yaml`: removed Sass
- `src/app/hooks.test.ts`: See Notes
- `src/app/hooks.ts`: See Notes
- `src/app/utils/getBackground.ts`: See Notes
- `src/settings/SettingsTab.ts`: 'text' to `type: 'file'`, filtered to `BACKGROUND_IMAGE_EXTENSIONS`; removed from `DEBOUNCED_SETTING_KEYS`.
- `src/types.ts`: See Notes
- `src/app/App.css` *(renamed from `src/app/App.scss`)*: removed Sass
- `src/ui/modals/CustomQuotesModal.css` *(renamed from `src/ui/modals/CustomQuotesModal.scss`)*: removed Sass
- `src/settings/Settings.css` *(renamed from `src/settings/Settings.scss`)*: removed Sass
- `styles.css` *(renamed from `styles.scss`)*: removed Sass

### New Files Created
- `.obsidian/plugins/obsidian-style-settings/manifest.json`: [description]
- `.obsidian/plugins/obsidian-style-settings/styles.css`: [description]
- `ARCHIVE/CHANGELOG-2026-09-12.md`: this changelog
- `src/settings/settingsTab.test.ts`: first set of tests for new behavior, based on [[Tab Candy Testing Specification]]

### Files Removed / Archived


<!-- archivist:auto-end -->
## Notes

**Commit Message**
feat: style customizations

- settings page now split into two topics: function and design. Bookmarks, quotes, recent files, etc are accessed under function. Background image settings are accessed under design. This preempts planned features.
- `customBackground` locked down. It used to accept a raw string; a user could pass a URL and Tab Candy would pull the image. This is no longer the case. Tab Candy reads image files in the vault via the picker for local-only functionality.
- two colors brought under Style Settings configuration for integrated customization UX. This also preempts planned features.
- removed Sass. Unnecessary package; all CSS is natively implemented with little changes. Comments are migrated, and `@use` becomes `@import`. Everything else remains the same.


Based on [[Roadmap]]

**Track A — done.**
- `src/settings/SettingsTab.ts` restructured into two `SettingDefinitionPage` entries (`Function`/`Design`), all groups relocated unchanged, plus the optional `status: 'warning'` badge, scoped to `BackgroundTheme.LOCAL` only.
- `src/settings/SettingsTab.test.ts` — new, 8 structural tests per §7.

**`customBackground` patch — done.**
Native `type: 'file'` control with a `filter` predicate for vault-file-suggester UX.

Changes:
- `src/settings/SettingsTab.ts` — control changed from `type: 'text'` to `type: 'file'`, filtered to `BACKGROUND_IMAGE_EXTENSIONS`; removed from `DEBOUNCED_SETTING_KEYS`.
- `src/app/utils/getBackground.ts` — `customBackground` param is now `string | null`, resolved by the caller instead of passed through raw.
- `src/app/hooks.ts` — `useBackground()` now resolves `customBackground` through `filterExistingFiles` + `getBackgroundResourcePath`, same defensive pattern as `manualBackgroundFiles`/`backgroundFiles`, so a missing file degrades to "no background" instead of a broken image.
- `src/app/hooks.test.ts` — 3 new `useBackground` cases (resolves, missing file, unset).

**Track B: done.** Two files changed, no TypeScript/settings work at all — this track was pure CSS.

- `styles.scss` — the `/*! @settings */` block (two `variable-color` entries) plus the two global tab-bar rules, each falling straight through to Obsidian's own live theme variable.
- `main.ts` — one-line `this.app.workspace.trigger('parse-style-settings')` addition per Style Settings' plugin-support contract.

Two things worth flagging that I caught by actually building the project rather than trusting the spec's prose:

1. **The `@settings` comment needs `/*!`, not `/*`.** running a production build (esbuild + the sass plugin + minification) removes plain `/*` from the compiled `styles.css`. `/*!` survives (moved to end-of-file, which doesn't matter — Style Settings scans the whole file, not just the top, so the spec's "lives at the top" framing was describing convention, not a requirement). Confirmed in a live Obsidian vault. This is also listed in Style Settings' GitHub history — they hit and fixed this same class of bug themselves (`7035a31 Include "/*! @settings" when looking for settings`).
2. **Untouched settings genuinely don't get written to `:root`.** Confirmed via bug report against Style Settings (`#187`) complaining about this behavior for a sibling setting type — so the "off = zero footprint" design is sound.

Verified: exactly one `@settings` block in the compiled output, YAML parses cleanly, both tab-bar rules present. No test changes needed — nothing here is testable Vitest-side; it's CSS and one Obsidian API call, both squarely in the "manual verification" bucket per the Testing Spec.

**Sass → CSS conversion: done**

All three `.scss` partials renamed to `.css` (content untouched apart from `//` → `/* */` comments — plain CSS doesn't have line comments, root `styles.scss` → `styles.css` with `@use` → `@import`, `esbuild-sass-plugin` and `sass-embedded` dropped from `package.json` and `esbuild.config.js` entirely. `esbuild` now bundles the CSS natively, no plugin needed.

---

*This changelog was automatically generated by Archivist CLI.*
*See [Archivist CLI](https://github.com/lvnacy-notes/archivist-cli) for more information.*