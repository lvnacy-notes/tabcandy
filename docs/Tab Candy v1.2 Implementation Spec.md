# Tab Candy v1.2 — Style Customization: Implementation Spec

Companion to the v1.2 section of `Roadmap.md`. That doc says *what* and *why* at a glance; this says *exactly how*, down to variable names, file paths, and settings shapes, so implementation doesn't have to re-derive any of it.

## 1. Summary

Three tracks, built in order — A before B and C, specifically, not just alphabetically:

- **Track A — Settings tab restructuring.** The flat, ten-group settings list gets split into two navigable pages, "Function" and "Design," using Obsidian's own native `SettingDefinitionPage` mechanism. Built first so Track B and C's new settings land directly in the right place from day one, instead of bolting onto the old flat list and getting reorganized after the fact.
- **Track B — Tab bar style, via Style Settings.** Recolors Obsidian's own tab-bar chrome (label, active state, linked-group dot). Manual customization through the Style Settings plugin, plus an optional "match my theme" toggle for automatic theming with no configuration.
- **Track C — Overlay text: image-matched, with a legibility guarantee.** A standalone toggle, visible only when a background image is active, that extracts the image's dominant color and uses it (contrast-adjusted) as the overlay text color — the new tab visually matches the photo, not just avoids clashing with it. A plain light/dark fallback sits underneath as the legibility floor for images where no adjustment of the dominant color reaches a readable result.

B and C don't interact with each other, share no code path, and could ship independently of one another. Both depend on A only in the sense of "where their new toggle lives," not in any code-level way — A is a pure reorganization of `getSettingDefinitions()`'s return shape, nothing more.

## 2. Goals / non-goals

**Goals**
- Split the settings tab into "Function" and "Design" pages via Obsidian's native declarative sub-page mechanism, so the list doesn't keep growing as one long scroll.
- Recolor a small, fixed set of tab-bar elements via the de facto standard mechanism (Style Settings), without Tab Candy ever parsing untrusted CSS.
- Offer automatic theme-matching for users who don't want to configure anything.
- Extract the background image's dominant color and use it as the overlay text color, so the new tab visually matches the photo rather than just sitting on top of it in a fixed neutral tone.
- Guarantee legible overlay text over an arbitrary user-supplied background image, even when the extracted dominant color alone wouldn't be legible as-is.

**Non-goals (this version)**
- Styling the new-tab dashboard's own elements (search pill, Recent Files/Bookmarks background) — deferred to v2.0, once sections have a `type` to hang per-widget settings off of. The dominant color extracted here is scoped to overlay *text* only; it doesn't yet feed the pill background or anything else.
- A literal tab bar UI. Considered and deliberately rejected in favor of Track A's drill-down page model — see §3 for why.

## 3. Track A — Settings tab restructuring, via `SettingDefinitionPage`

### 3.1 What this actually is

Not a hand-rolled tab switcher. `SettingsTab.ts` already opts into Obsidian 1.13's real, official declarative settings API (`getSettingDefinitions()`/`getControlValue()`/`setControlValue()`), and that same API ships a native type for exactly this: `SettingDefinitionPage`. A page entry renders as a single navigable row in the main list — a name, an optional description, an optional live `displayValue`, an optional `status: 'warning'` badge — and clicking it drills into a dedicated sub-page using Obsidian's own back-navigation chrome, the same pattern as clicking into "Hotkeys" or "Community plugins" from core Settings.

This is a drill-down/back-navigation model, not a persistent tab bar users flip between. Deliberately chosen over hand-rolling tabs: zero custom markup, zero custom CSS, zero ARIA to build by hand, and it looks and behaves exactly like every other multi-page settings surface in Obsidian, rather than teaching a bespoke pattern. It also fits how people actually use a settings screen — visited once, configured, left — better than a tab-bar metaphor borrowed from browsers and documents.

### 3.2 Structure

`getSettingDefinitions()` currently returns a flat array of `SettingDefinitionGroup` entries, one per heading: `New tab behavior`, `Background settings`, an unnamed group, `Local background images`, `Search settings`, `Time settings`, `Greeting settings`, `Recent file settings`, `Bookmark settings`, `Quote settings`.

It becomes exactly two top-level `SettingDefinitionPage` entries, each nesting the existing groups as its `items`:

```ts
getSettingDefinitions(): SettingDefinitionItem[] {
  return [
    {
      type: 'page',
      name: 'Function',
      desc: 'New tab behavior, search, time, recent files, bookmarks, and quotes.',
      items: [
        newTabBehaviorGroup,
        searchSettingsGroup,
        timeSettingsGroup,
        greetingSettingsGroup,
        recentFileSettingsGroup,
        bookmarkSettingsGroup,
        quoteSettingsGroup,
      ],
    },
    {
      type: 'page',
      name: 'Design',
      desc: 'Backgrounds, tab bar colors, and overlay text.',
      items: [
        backgroundSettingsGroup,
        unnamedBackgroundSubGroup,
        localBackgroundImagesGroup,
        styleCustomizationGroup, // new — Track B/C's toggles land here directly, not appended after the fact
      ],
    },
  ];
}
```

**Function**: New tab behavior, Search, Time + Greeting, Recent Files + Bookmarks, Quotes — everything that controls what the new tab *does*.

**Design**: Background settings (+ its unnamed sub-group and Local Background Images), plus the new Style Customization group Tracks B and C add — everything that controls what it *looks like*.

### 3.3 What doesn't change

This is purely a reorganization of the array `getSettingDefinitions()` returns — a presentation-layer regrouping, nothing else. Each existing group's `items`, and each item's `id`/`getControlValue`/`setControlValue` bindings, are untouched; they still read and write the exact same `TabCandySettings` keys regardless of which page they're nested under. Concretely: **no changes to `types.ts`, `defaultSettings.ts`, or `normalizeSettings.ts` are needed for this track at all** — there's no settings-shape change, so no migration, no `CURRENT_SETTINGS_VERSION` bump, none of the risk v2.0's actual dashboard-sections migration will carry. Worth stating plainly since it's the reason this track is safe to build first and fast: it's an unusually low-risk change for how much it improves the settings tab.

### 3.4 Optional, not required for the base restructuring

- **`status: 'warning'` on the "Design" page.** A real, already-plausible failure mode fits this naturally: `backgroundTheme` set to `CUSTOM`/`LOCAL` but the referenced path no longer resolving to a file (the same condition `pruneMissingManualBackgroundFiles()` already detects). Flagging it on the page entry means the user sees something needs attention without having to open the page to find out. Nice to have, not required for the base split — don't let it block shipping the restructuring itself.
- **`displayValue` on either page.** Available, but no specific copy is settled here — don't invent UI text nobody's agreed on just because the field exists.

## 4. Track B — Tab bar Style Settings + theme match

### 4.1 Target selectors

Real Obsidian chrome, not anything Tab Candy owns:

| Element | Selector |
|---|---|
| Tab label text | `.workspace-tab-header-inner-title` |
| Active tab state | `.workspace-tab-header.mod-active` |
| Linked-group color dot | `.workspace-tab-header-status-container` |

**Before writing the `@settings` block**, confirm all three against a current Obsidian build via devtools. These are standard and well-documented in the community CSS-snippet ecosystem, but that ecosystem isn't a stability guarantee — Obsidian could rename or restructure this markup between versions in a way `.tabcandy-root` never could, since that one's ours.

### 4.2 Variable naming & the fallback-indirection mechanism

Every color slot gets **two** custom properties, not one:

- `--tabcandy-tab-<slot>` — the real, user-facing variable. Only ever written by Style Settings, and only when the user has actually touched that specific setting.
- `--tabcandy-tab-<slot>-fallback` — written by Tab Candy itself, switched by the "match my theme" toggle. Never touched by Style Settings.

Every consumption site reads `var(--tabcandy-tab-<slot>, var(--tabcandy-tab-<slot>-fallback))`.

This is the whole mechanism. Because Style Settings and the toggle write to two different variable names, they are structurally incapable of fighting over which one wins — there is no precedence logic to write, and no need to detect whether Style Settings is installed or enabled.

Initial slot list (extend as needed, keep the naming pattern):

- `--tabcandy-tab-label-color`
- `--tabcandy-tab-active-color`
- `--tabcandy-tab-group-dot-color`

### 4.3 `/* @settings */` block (draft)

Lives at the top of Tab Candy's own compiled `styles.css` (built from `styles.scss` — see §6). Style Settings scans plugin-shipped CSS automatically; no separate opt-in file needed.

```css
/* @settings

name: Tab Candy
id: tabcandy
settings:
    -
        id: tabcandy-tab-label-color
        title: Tab label color
        type: variable-color
        format: hex
        default: '#dadada'
    -
        id: tabcandy-tab-active-color
        title: Active tab color
        type: variable-color
        format: hex
        default: '#dadada'
    -
        id: tabcandy-tab-group-dot-color
        title: Linked-group dot color
        type: variable-color
        format: hex
        default: '#dadada'

*/
```

Defaults here are placeholders — pull the real current visual values from a running Obsidian instance with a default theme before finalizing, don't guess.

### 4.4 SCSS consumption

```scss
.workspace-tab-header-inner-title {
  color: var(--tabcandy-tab-label-color, var(--tabcandy-tab-label-color-fallback));
}

.workspace-tab-header.mod-active {
  color: var(--tabcandy-tab-active-color, var(--tabcandy-tab-active-color-fallback));
}

.workspace-tab-header-status-container {
  color: var(--tabcandy-tab-group-dot-color, var(--tabcandy-tab-group-dot-color-fallback));
}
```

### 4.5 "Match my theme" toggle

A class on `<body>` (not `.tabcandy-root` — these selectors live in the global tab bar, outside Tab Candy's own view entirely), toggled by a new setting, controlling only the `-fallback` variables:

```scss
body {
  --tabcandy-tab-label-color-fallback: #dadada;
  --tabcandy-tab-active-color-fallback: #dadada;
  --tabcandy-tab-group-dot-color-fallback: #dadada;
}

body.tabcandy-match-theme {
  --tabcandy-tab-label-color-fallback: var(--text-normal);
  --tabcandy-tab-active-color-fallback: var(--text-accent);
  --tabcandy-tab-group-dot-color-fallback: var(--interactive-accent);
}
```

The class is added/removed on `document.body` from the plugin (in `main.ts`, alongside other one-time DOM setup) whenever the setting changes — not from React, since these selectors are outside the Tab Candy view's own DOM tree entirely.

### 4.6 Settings shape

**`types.ts`** — add to `TabCandySettings`:
```ts
matchThemeColors: boolean;
```

**`defaultSettings.ts`**:
```ts
matchThemeColors: false,
```

**`normalizeSettings.ts`**: add a `typeof data.matchThemeColors === 'boolean'` branch, same shape as every existing boolean field. Bump `CURRENT_SETTINGS_VERSION`? No — this is a new field with a safe default, not a restructuring of an existing one. Compare against the `showRecentFiles` precedent, not the "shape changed" case v2.0 will actually need.

**`SettingsTab.ts`**: new toggle control, `key: 'matchThemeColors'`, under a new "Style Customization" group — nested inside Track A's "Design" page `items` (§3.2) from the start, not appended to the old flat array and moved later. No `visible` condition — always available, unlike Track C.

**`main.ts`** `onload()`: apply/remove the `tabcandy-match-theme` body class based on the setting, both on load and whenever `settingsStore` emits a change (there should already be a settings-change subscription pattern to hook into — check how other body/global-level effects, if any, currently react to settings changes; if there are none yet, this is the first one).

### 4.7 `parse-style-settings`

Call `app.workspace.trigger('parse-style-settings')` once in `main.ts`'s `onload()`, after `addSettingTab()`, per Style Settings' documented plugin-support contract.

## 5. Track C — Overlay text: dominant color, with a legibility floor

### 5.1 Visibility condition

The toggle is visible in settings only when a background image is actually active:

```ts
visible: () =>
  this.plugin.settings.backgroundTheme === BackgroundTheme.CUSTOM ||
  this.plugin.settings.backgroundTheme === BackgroundTheme.LOCAL,
```

(Matches the existing `visible: () => ...` pattern already used for `customBackground` and `bookmarkGroup` in `SettingsTab.ts` — see those for the exact shape.) `BackgroundTheme.TRANSPARENT` and `TRANSPARENT_WITH_SHADOWS` mean no image is showing, so the toggle is moot there.

### 5.2 Computation

One canvas pass produces both numbers this needs — extract them together, not as two separate image reads.

1. Draw the image to an offscreen `<canvas>`, **downsampled** to something small (e.g. 32×32). This is a color/brightness heuristic, not a precision task, and downsampling keeps the per-pixel work cheap regardless of the source image's real resolution.
2. `getImageData()` on the downsampled canvas. Single read, used for both steps below.
3. **Average perceived brightness** (the legibility floor): `0.299*R + 0.587*G + 0.114*B` per pixel, averaged across all sampled pixels. This is the same measure as before — it doesn't go away, it becomes the input to step 5 instead of the whole output.
4. **Dominant color** (the actual goal): a plain average of all pixels tends to produce a muddy gray — that's not a usable "matches the photo" color, and it's why this needs real quantization, not just a mean:
   - Quantize each pixel's RGB by rounding each channel to the nearest bucket (e.g. buckets of 32, giving an 8×8×8 space) and tally frequency per bucket.
   - Weight each pixel's contribution by its saturation (convert to HSL first) before adding it to its bucket's tally, and give pixels below a saturation floor (e.g. 0.15) a heavily reduced weight rather than zero — this biases toward a vivid, recognizable color over a boring average, without producing an empty result for a genuinely low-saturation photo (fog, snow, overcast sky), where the least-drab bucket is still the right answer.
   - The bucket with the highest total weight wins. Its representative color is the average RGB of the actual pixels that fell into it (not the bucket's numeric center), so the result stays a real color that appeared in the image.
5. **Contrast-adjust the dominant color against the average brightness from step 3**: convert the dominant color to HSL, then nudge its lightness (`L`) up or down — darken if the average brightness is high, lighten if it's low — until the adjusted color's own perceived brightness clears a minimum contrast margin against the average. Preserve hue and saturation; only `L` moves. Clamp the number of adjustment steps and the `L` range (e.g. don't push past 10% or 90%).
6. **Legibility floor**: if step 5 can't reach the minimum contrast margin within the clamped `L` range — genuinely rare, but possible for a dominant color that's very close to the image's own average brightness even at the extremes — fall back to a flat literal (today's `#dadada` for light-on-dark, or a dark literal for dark-on-light), chosen by the same brightness threshold the original single-purpose version of this feature used. This is the safety net, not the common case.

```ts
interface OverlayContrastResult {
  dominantColor: string; // hex, raw extracted color, before adjustment
  overlayTextColor: string; // hex, contrast-adjusted - the value actually consumed
}

async function computeOverlayContrast(imageUrl: string): Promise<OverlayContrastResult> {
  const img = await loadImage(imageUrl); // new Image(), await onload
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // fail open to today's default, never throw
    return { dominantColor: '#dadada', overlayTextColor: '#dadada' };
  }

  ctx.drawImage(img, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);

  let brightnessTotal = 0;
  const buckets = new Map<string, { weight: number; r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    brightnessTotal += 0.299 * r + 0.587 * g + 0.114 * b;

    const { s } = rgbToHsl(r, g, b);
    const weight = s < 0.15 ? 0.1 : s;

    const key = `${Math.round(r / 32)},${Math.round(g / 32)},${Math.round(b / 32)}`;
    const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0, count: 0 };
    bucket.weight += weight;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const pixelCount = data.length / 4;
  const averageBrightness = brightnessTotal / pixelCount;

  let dominant = { r: 218, g: 218, b: 218 }; // #dadada, fallback if somehow no buckets
  let bestWeight = -1;
  for (const bucket of buckets.values()) {
    if (bucket.weight > bestWeight) {
      bestWeight = bucket.weight;
      dominant = {
        r: bucket.r / bucket.count,
        g: bucket.g / bucket.count,
        b: bucket.b / bucket.count,
      };
    }
  }

  const dominantHex = rgbToHex(dominant.r, dominant.g, dominant.b);
  const overlayTextColor = adjustForContrast(dominant, averageBrightness);

  return { dominantColor: dominantHex, overlayTextColor };
}
```

`rgbToHsl`, `rgbToHex`, and `adjustForContrast` (the step-5 lightness nudge, with the step-6 fallback baked in as its final else-branch) are small, self-contained utilities — see §6 for where they live.

### 5.3 Caching

Compute once per background image, not on every render or every new-tab open.

- **Cache key**: the vault-relative path of the background image (from `backgroundFiles`/`manualBackgroundFiles`/`customBackground` — whichever is active), plus the file's `mtime` (via `app.vault.getAbstractFileByPath(path)?.stat.mtime` for local images; skip mtime entirely for a `customBackground` value that doesn't resolve to a `TFile`).
- **Storage**: persisted in `data.json`, not session-only — this is a stable property of a specific image, unlike the recently-closed-tabs stack (v1.3), which is inherently about the current session.
- **Shape**: `Record<vaultPath, { mtime: number } & OverlayContrastResult>` — caching both the raw dominant color and the adjusted text color, not just the final one. `dominantColor` isn't consumed by anything yet, but it's the same underlying signal a future v2.0 per-widget theming feature would want (see the Non-goals note above), and it costs nothing extra to keep now rather than re-deriving it later.
- **Pruning**: same pattern as `pruneMissingManualBackgroundFiles()` in `backgrounds.ts` — drop cache entries for paths that no longer resolve to a `TFile`, on the same sync/load path that already prunes `manualBackgroundFiles`.

**`types.ts`** addition:
```ts
autoContrastOverlayText: boolean;
overlayTextContrastCache: Record<string, { mtime: number } & OverlayContrastResult>;
```

**`defaultSettings.ts`**:
```ts
autoContrastOverlayText: false,
overlayTextContrastCache: {},
```

**`SettingsTab.ts`**: the "Auto-contrast overlay text" toggle, gated by the `visible` condition in §5.1, nested inside the same "Style Customization" group as Track B's toggle (§4.6) — inside Track A's "Design" page from the start.

### 5.4 Consumption

The `#dadada` this replaces is currently hardcoded one level up, on `.workspace-tabs .workspace-leaf-content.tabcandy` in `App.scss` — `.tabcandy-root` itself sets no `color` today and just inherits it. Add the override directly on `.tabcandy-root` instead of touching the parent rule; being more specific, it wins over the inherited value without needing to edit or remove the existing declaration:

```scss
.tabcandy-root {
  color: var(--tabcandy-overlay-text, #dadada);
}
```

`.tabcandy-root` is `BackgroundSurface` (`src/app/components.tsx`) — the same component that already sets `backgroundImage` as an inline style when `background` is provided. `--tabcandy-overlay-text` follows the identical shape: a new `overlayTextColor?: string | null` prop on `BackgroundSurfaceProps`, threaded through from `App.tsx` (which calls the new `useOverlayContrast()` hook, the same way it already calls `useBackground()` and passes the result down as `background`), folded into the same `style` object alongside `backgroundImage` rather than as a second inline-style mechanism:

```tsx
style={
  background || overlayTextColor
    ? {
        ...(background ? { backgroundImage: `url('${background}')` } : {}),
        ...(overlayTextColor ? { '--tabcandy-overlay-text': overlayTextColor } : {}),
      }
    : undefined
}
```

Not a class toggle like Track B — this needs a real per-image value, not a fixed pair swapped globally. No interaction with Track B's variables at all — different property, different mechanism, by design.

### 5.5 Scope

Local vault images only, always — Tab Candy backgrounds never pull from a remote URL, so canvas readback via `getImageData()` is always safe: `getBackgroundResourcePath()` resolves through `app.vault.adapter.getResourcePath()`, Obsidian's own local resource scheme, which never triggers a cross-origin canvas taint. No detection branch, no failure mode to handle here — every background this computation ever sees is local by construction.

Recompute is triggered by whichever background actually changed: the background-sync events already wired up in `backgrounds.ts` are the natural hook point, not a new watcher.

## 6. Files touched

| File | Change |
|---|---|
| `src/settings/SettingsTab.ts` | `getSettingDefinitions()` restructured into two `SettingDefinitionPage` entries (§3.2); Track B and C's new toggles nested under "Design" from the start (§4.6, §5.3) |
| `src/settings/SettingsTab.test.ts` (or wherever `getSettingDefinitions()` is covered today) | Structural assertions on the new page shape — see §7 |
| `styles.scss` (or wherever the `@settings` block should live in the source tree — confirm entry point feeding compiled `styles.css`) | New `@settings` block (§4.3) |
| `src/app/App.scss` | Track B selectors' rules (§4.4/4.5); `.tabcandy-root` color swapped to `var(...)` (§5.4) |
| `src/types.ts` | `matchThemeColors`, `autoContrastOverlayText`, `overlayTextContrastCache` |
| `src/settings/defaultSettings.ts` | Defaults for the three new fields |
| `src/settings/normalizeSettings.ts` | Validation branches for the three new fields |
| `src/settings/normalizeSettings.test.ts` | Per-field malformed/missing/legacy cases — see §7 |
| `src/services/backgrounds.ts` | Contrast-cache pruning alongside existing `pruneMissingManualBackgroundFiles()` |
| `src/services/backgrounds.test.ts` | Pruning cases for `overlayTextContrastCache` — see §7 |
| New: `src/services/overlayContrast.ts` | `computeOverlayContrast()`, its `rgbToHsl`/`rgbToHex`/`adjustForContrast` helpers, and cache read/write |
| New: `src/services/overlayContrast.test.ts` | Co-located, per project convention — see §7 |
| `src/app/hooks.ts` | New `useOverlayContrast()` hook, mirroring `useBackground()`'s shape |
| `src/app/hooks.test.ts` | `useOverlayContrast()` cases, mirroring the existing `useBackground()` coverage — see §7 |
| `src/app/App.tsx` | Call `useOverlayContrast()`; pass `overlayTextColor` down as a new prop to `BackgroundSurface` |
| `src/app/components.tsx` | `BackgroundSurfaceProps` gains `overlayTextColor`; folded into the existing `style` object alongside `backgroundImage` (§5.4) |
| `src/app/components.test.tsx` | Extends the existing `describe('BackgroundSurface', ...)` block — see §7 |
| `main.ts` | `tabcandy-match-theme` body class management; `parse-style-settings` trigger |
| `main.test.ts` (if the body-class logic ends up as a new settings-store subscription — see §9) | Leak/double-fire check, same bar as every other subscription in this codebase |

## 7. Testing

Per `docs/Tab Candy Testing Specification.md`: coverage goes where a regression would actually hurt, not evenly across everything this feature touches. Nothing here is itself on the spec's named load-bearing list, but two pieces of it run through load-bearing surfaces (`normalizeSettings.ts`, the settings store's subscribe/unsubscribe) and inherit that bar rather than the supplementary one. Everything else is supplementary — real, worth having, but not held to the same standard.

### Automated (Vitest, co-located unless noted)

**`getSettingDefinitions()`'s new shape — supplementary, structural only.** Whether a `SettingDefinitionPage` actually renders a navigable row with working back-navigation is Obsidian's own rendering behavior — Trust Boundaries: not ours to re-verify, and nothing a jsdom-based test could observe regardless. What's ours, and testable, is the data our own function returns:
- Exactly two top-level entries, both `type: 'page'`, named `'Function'` and `'Design'`.
- `'Design'`'s `items` contains the Background/Local-images groups plus the Style Customization group once Track B/C's toggles exist.
- If the optional `status: 'warning'` callback (§3.4) gets built: test it as the plain function of settings state it is (missing background file → `'warning'`; valid background → `null`) — no different from any other pure function in this spec.

**`normalizeSettings.ts` — load-bearing, not supplementary.** The spec calls this "the single highest-consequence file in the codebase" and "When to Expand the Suite" makes a new setting's malformed/missing/legacy handling mandatory. One case per field, not one bullet for all three:
- `matchThemeColors`: missing → defaults to `false`; wrong type (string, number) → defaults to `false`.
- `autoContrastOverlayText`: same two cases.
- `overlayTextContrastCache`: missing → defaults to `{}`; not an object at all → defaults to `{}`; one malformed entry (non-numeric `mtime`, missing `overlayTextColor`) → that entry is dropped, the rest of the cache survives.

**Cache pruning — inherits the "background resolution degrades gracefully" load-bearing bar**, since it's the same class of problem (a vault that's changed out from under the plugin) as the existing `pruneMissingManualBackgroundFiles()` case it's modeled on, not a new category of risk:
- Entry for a since-deleted file is dropped.
- Entry whose cached `mtime` no longer matches the file's current `mtime` (edited since last computed) is dropped, not served stale — the case a single "removes entries for deleted files" test wouldn't catch.
- Entry for a still-valid, unchanged file survives a prune pass untouched.

**`computeOverlayContrast()` — supplementary, our own logic only, never the dependency.** Synthetic canvases, per Trust Boundaries — this tests our math against known pixel data, never `getImageData()`/Canvas itself:
- Solid black / solid white / solid mid-gray → correct legibility-floor fallback.
- One clearly dominant saturated color against a desaturated field → that color wins the histogram.
- A uniformly low-saturation image (all grays) → still returns a dominant color, not an empty/undefined result — the saturation-weighting floor doing its job.

**`adjustForContrast()` — isolated, one case per branch**: needs darkening, needs lightening, and can't reach the margin within the clamped `L` range and falls through to the legibility-floor literal.

**`useOverlayContrast()` — a hook, gets its own co-located test file**, the same as `useBackground()` (its direct sibling):
- Returns a cached value without recomputing when the cache is fresh.
- Triggers recomputation when the cache is missing, or the file's `mtime` has moved past the cached entry.
- Returns no override when no background is active — the toggle being on doesn't matter if there's nothing to compute against.
- Returns no override when the `autoContrastOverlayText` toggle is off, even with an active background and a valid cache entry sitting right there — the toggle itself is a real branch, distinct from "no background" above, and belongs here rather than being inferred from the component test.

**`BackgroundSurface` (`components.tsx`) — the one real branch this feature adds to an already-tested component, not a new "visual" test.** There's no visual assertion available here regardless: jsdom has no layout or paint engine, and nothing in `obsidian`/`obsidian-test-mocks` fills that gap either, so "does this look right" was never on the table as something this suite could check. What *is* checkable is the literal string this component's own code puts into its `style` object — the exact same thing the existing `background` → `backgroundImage` tests already check, extended with the new prop rather than inventing a new file or a new kind of test:
- `overlayTextColor` provided → `root.style.getPropertyValue('--tabcandy-overlay-text')` equals it. Direct sibling of the existing `'sets the background image inline style when a background is provided'` case.
- `overlayTextColor` absent/`null` → the custom property is unset, falling through to the SCSS default. Direct sibling of `'leaves the inline style unset when there is no background'`.
- Both `background` and `overlayTextColor` provided together → both land in the same `style` object; setting one doesn't clobber the other.

**`main.ts`'s `tabcandy-match-theme` body-class management — touches the settings-store subscribe/unsubscribe load-bearing behavior, if it ends up needing a new subscription** (the open question already flagged in §9). Whichever way that's resolved: added once, torn down in `onunload()`, doesn't double-fire on a rapid double-toggle — the existing subscribe/unsubscribe tests elsewhere in this codebase are the model to extend, not a one-off case invented for this feature.

No new debounce or interval is introduced anywhere in this feature — the caching design in §5.3 exists specifically so nothing needs to run on a timer. Noted so its absence from this list isn't mistaken for an oversight of the "fake timers everywhere a debounce is under test" rule.

### Manual (outside the Vitest suite, not gated by the coverage Ratchet)

Each of these falls outside the automated boundary for a specific, stated reason, not just "hard to automate":

- **The "Function"/"Design" split actually navigates correctly** — clicking each page entry opens the right sub-page, back-navigation returns to the top level, every relocated setting still edits the same underlying value it always did. Obsidian's own settings-page chrome — Trust Boundaries: not ours to re-verify, and this is exactly the kind of thing §3.3 already establishes doesn't change at the data layer, so a manual smoke check is about confirming the reorganization, not the mechanism.
- **Style Settings actually renders the three color pickers and edits take effect live**, in both a themed and un-themed vault. Another plugin's own UI — Trust Boundaries: not ours to re-verify, and it isn't present in the test environment regardless.
- **Toggling "match my theme" while a Style Settings value is *also* set for the same slot** — confirm Style Settings wins, exactly as designed in §4.2. Depends on the real CSS cascade with a live third-party plugin, not something either fakes.
- **A handful of real, varied background photos** (high-contrast, low-contrast, near-monochrome, one with an obvious dominant hue) — confirm the extracted color actually looks like "the photo." Deliberately *not* pinned as an automated assertion against a fixed expected output: §9 already flags the quantization/contrast constants as unset starting points expected to be tuned against exactly this kind of real-photo pass, and a hardcoded expected-color test would just be a snapshot test wearing a different hat — banned outright, and for the right reason here specifically, since it would fail on every legitimate tuning pass rather than catching a real regression.

## 8. Implementation checklist

Ordered by dependency — each item assumes the ones above it are done. Track A goes first, deliberately, so B and C's settings land in the right place instead of being written flat and reorganized later. Test items sit next to the code they cover, not bundled into a separate pass at the end — a bug fix later needs a test that would've caught it, and that's easiest to keep true when the two are written together from the start.

**Track A**
- [ ] Restructure `getSettingDefinitions()` into two `SettingDefinitionPage` entries, `'Function'` and `'Design'` (§3.2), relocating the existing groups into the appropriate page's `items` — no changes to `types.ts`/`defaultSettings.ts`/`normalizeSettings.ts` needed for this step (§3.3).
- [ ] Structural tests on the new shape (§7) land with this change.
- [ ] Manual: confirm navigation and that every relocated setting still edits the value it always did (§7).
- [ ] Optional: `status: 'warning'` on "Design" for a missing background file (§3.4) — don't block the base restructuring on this.

**Track B**
- [ ] Confirm the three tab-bar selectors (§4.1) against a current Obsidian build.
- [ ] Add `matchThemeColors` to `types.ts`, `defaultSettings.ts`, `normalizeSettings.ts`, with its malformed/missing test cases (§7) — mandatory per the testing spec's "new setting" trigger, not optional polish.
- [ ] Write the `@settings` block (§4.3) into the source feeding `styles.css`.
- [ ] Add Track B's SCSS rules and fallback-variable defaults (§4.4/4.5).
- [ ] Add the "match my theme" toggle to `SettingsTab.ts`, nested in the "Design" page's Style Customization group (§4.6); wire body-class management into `main.ts`.
- [ ] If body-class management needs a new settings-store subscription: add its leak/double-fire test alongside it, same bar as every other subscription in this codebase (§7, §9).
- [ ] Call `app.workspace.trigger('parse-style-settings')` in `main.ts`.
- [ ] Manual: Style Settings renders the three pickers; edits apply live; "match my theme" changes the fallback only, never fights a Style Settings value (§7).

**Track C**
- [ ] Add `autoContrastOverlayText`, `overlayTextContrastCache` to `types.ts`, `defaultSettings.ts`, `normalizeSettings.ts`, with their malformed/missing test cases (§7).
- [ ] Write `src/services/overlayContrast.ts`: `rgbToHsl`/`rgbToHex` conversion utilities first, as standalone testable units.
- [ ] Implement the quantization/weighting histogram and dominant-color selection (§5.2 steps 1–4). `overlayContrast.test.ts`: synthetic-canvas cases (§7) land with this, not after.
- [ ] Implement `adjustForContrast()` (§5.2 step 5) and the legibility-floor fallback (§5.2 step 6), with its isolated per-branch test cases (§7).
- [ ] Wire the two into `computeOverlayContrast()`, plus cache read/write and path+mtime keying.
- [ ] Add cache pruning to `backgrounds.ts`, alongside `pruneMissingManualBackgroundFiles()`, with the deleted-file *and* stale-mtime cases (§7) — this one inherits the load-bearing bar, not the supplementary one.
- [ ] Add `useOverlayContrast()` to `hooks.ts`, with its own co-located test file mirroring `useBackground()`'s (§7).
- [ ] Add the "Auto-contrast overlay text" toggle to `SettingsTab.ts`, nested in the same Style Customization group as Track B (§5.3), gated by the `visible` condition (§5.1).
- [ ] Add `overlayTextColor` to `BackgroundSurfaceProps`, folded into the existing `style` object (§5.4); wire `App.tsx` to call `useOverlayContrast()` and pass it down. Extend the existing `describe('BackgroundSurface', ...)` block in `components.test.tsx` with the three cases from §7 as part of this same change, not after.
- [ ] Swap the hardcoded `#dadada` in `App.scss` for `var(--tabcandy-overlay-text, #dadada)`.
- [ ] Manual: real-photo pass per §7 — tune the constants flagged in §9 against what actually looks right, don't treat the starting values as final.

## 9. Open items, non-blocking

- Exact hex defaults in the `@settings` block (§4.3) are placeholders pending a look at a real running instance.
- Whether `main.ts` already has a general "react to any settings change" hook to attach the body-class logic to, or whether this is the first thing that needs one — check before assuming a new subscription needs to be built from scratch. If it is the first one, its test (§7) is what makes that new subscription trustworthy, not just its own presumed correctness.
- The quantization bucket size (32), saturation floor (0.15), and contrast-margin/clamp values in `adjustForContrast()` are starting points, not tuned constants — expect to eyeball and adjust these against the real photos in §7's manual test pass, not to get them right from theory alone. The unit tests in §7 are written against clear/extreme synthetic cases specifically so they stay valid across that tuning — nothing there should need to change when these constants do.
- Whether `status: 'warning'` (§3.4) is worth building now or deferring — it's a nice-to-have on top of the base restructuring, not a requirement of it.