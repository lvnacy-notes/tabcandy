<div align="center">

# 🍬 Tab Candy

**A customizable new tab screen for [Obsidian](https://obsidian.md) — backgrounds, quotes, search, and more.**

[![CI](https://github.com/lvnacy-notes/tabcandy/actions/workflows/ci.yml/badge.svg)](https://github.com/lvnacy-notes/tabcandy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![A screenshot showing the Tab Candy screen](screenshots/mountains.png)

</div>

## What is this?

Tab Candy turns Obsidian's blank new-tab screen into something worth looking at: a background image, the time, a greeting, quick search, your recent files, your bookmarks, and a quote, all in one customizable view.

It's an **evolution** of [Beautitab](https://github.com/andrewmcgivery/obsidian-beautitab) — not a continuation of it. Beautitab fell into disrepair, as unmaintained projects tend to. Tab Candy started as a fork, but the codebase underneath it has since been rebuilt from the ground up: modernized against the current Obsidian API, made to work properly on both desktop and mobile, backed by an actual automated test suite, and given a CI pipeline that gates every change. What you're looking at today shares Beautitab's spirit and its original idea, but very little of its original code.

> [!NOTE]
> **A word of thanks.** None of this exists without Andrew McGivery's original work on Beautitab — the concept, the settings-first design philosophy, the whole idea of what a "pretty new tab" could be for Obsidian. Building something fun enough that someone else wants to keep it alive for years afterward is its own kind of success. Thank you for making Tab Candy possible in the first place. 🙏

## Features

### Background

A background image fills the screen behind everything else. It stays the same for the rest of the day (or until Obsidian restarts), and you can choose where it comes from:

- **Local** — a folder in your vault, synced automatically; add individual images one at a time if you'd rather not sync a whole folder.
- **Custom** — a single image URL you provide yourself.
- **Transparent** / **Transparent with shadows** — let your current Obsidian theme's own background show through instead.

### Time & greeting

The current time (12-hour or 24-hour) and a customizable greeting, shown front and center. Either can be hidden independently.

### Search

Two independent search entry points — a small icon in the top-left corner, and a larger inline search box in the center of the screen. Each can be shown or hidden on its own, and each can be configured to trigger a different command: Obsidian's built-in Quick Switcher by default, or a command from any other plugin you have enabled.

> [!TIP]
> Want a specific plugin supported as a search provider that isn't showing up? [Open an issue](../../issues) or [start a discussion](../../discussions).

### Recent files

Your 5 most recently edited files, one click away.

### Bookmarks

5 bookmarks, pulled either from your entire Bookmarks list or from one specific bookmark group you choose.

### Quote

A quote at the bottom of the screen, picked at random from your own list of custom quotes.

### Open automatically on new tabs

By default, opening a new empty tab in Obsidian shows Tab Candy automatically. If you'd rather trigger it manually instead, that's a setting too — either way, the **Open new tab** command in the command palette always works.

## Installation

Tab Candy isn't in Obsidian's community plugin browser yet. Until it is, install it one of these ways:

### Via BRAT (recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin from Obsidian's community plugin browser, if you don't already have it.
2. In BRAT's settings, choose **Add beta plugin** and enter this repository's URL.
3. Enable Tab Candy under **Settings → Community plugins**.

BRAT will also keep you on the latest release, betas included, if you opt into pre-releases in its settings.

### Manually

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Create a folder named `tabcandy` inside your vault's `.obsidian/plugins/` directory, and place the three files there.
3. Reload Obsidian, then enable Tab Candy under **Settings → Community plugins**.

## Settings

Every customization above lives in one place: **Settings → Tab Candy**.

![Settings screen within Obsidian](screenshots/settings.png)

## Screenshots

<table>
  <tr>
    <td><img src="screenshots/screenshot1.png" alt="Tab Candy screenshot" /></td>
    <td><img src="screenshots/screenshot2.png" alt="Tab Candy screenshot" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/screenshot3.png" alt="Tab Candy screenshot" /></td>
    <td><img src="screenshots/screenshot4.png" alt="Tab Candy screenshot" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/screenshot5.png" alt="Tab Candy screenshot" /></td>
    <td><img src="screenshots/screenshot6.png" alt="Tab Candy screenshot" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/screenshot8.png" alt="Tab Candy screenshot" /></td>
    <td><img src="screenshots/screenshot9.png" alt="Tab Candy screenshot" /></td>
  </tr>
</table>

## Reporting issues

Found a bug? [Open an issue](../../issues) and include as much detail as you can — what you expected, what happened instead, and a screenshot if it's visual. The more context, the faster it gets fixed.

## Contributing

Tab Candy has a real test suite (Vitest, run against mocked Obsidian internals) and a CI pipeline that runs typecheck, lint, tests, and a coverage floor on every pull request. If you're looking to contribute code, that's the bar a PR needs to clear.

```bash
pnpm install
pnpm test      # run the test suite
pnpm lint      # lint
pnpm build     # production build → dist/
```

Requires Node 24 or newer, and [pnpm](https://pnpm.io/) (version pinned in `package.json`).

## Credits

- Originally inspired by the Chrome extension [Momentum](https://momentumdash.com/).
- Built on the foundation laid by [Beautitab](https://github.com/andrewmcgivery/obsidian-beautitab) — see the note up top.

## Support

If Tab Candy's made your new tab screen a little nicer to look at, you can [buy me a coffee](https://ko-fi.com/lvnacy_).