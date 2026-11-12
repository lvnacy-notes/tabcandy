# Tab Candy Code Style Guide

Rules for code in this repository. `eslint` covers what Obsidian requires of plugins; this guide covers the rest.

## Layout

```
main.ts                 lifecycle only: loads settings, starts the runtime
src/
  runtime.ts            the single wiring point
  types.ts              every exported type and interface
  app/                  React new-tab UI
  clusters/             Cluster domain
  commands/             one file per command
  newtab/               what the new-tab view shows
  obsidian/             Obsidian-facing layer: views, menus, watchers, hijacks
  settings/             store, defaults, normalization
  tabs/                 tab tracking and navigation
  test/                 shared test helpers
  ui/                   modals
  utils/                general helpers
```

- `main.ts` holds the plugin class, its settings, and `onload()` calling `startRuntime()`. Nothing else.
- `runtime.ts` is the only place that registers events, views, menus and commands.
- Logic modules do not register anything. A `register*` function lives in `obsidian/` and calls the logic.
- A module belongs in the folder of its feature.

## File names

- PascalCase for modules exporting a class.
- camelCase for every other module.

## Comments

Comments describe the current behavior or contract of the module, class, or function they precede, and nothing else. Do not include decision history, rationale, alternatives considered, or any other process narration. That belongs in separate spec or implementation docs, not in code comments.

Every file begins with a `/** @file ... */` banner of one sentence saying what the module holds. Test files say what they test.

Every function has JSDoc with a one-sentence description, `@param` for each parameter, and `@returns` when it returns a value.

## One class per file

Hard rule: each file contains exactly one class. No exceptions.

## Ordering within a file

**Class files:**

1. `@file` banner and imports.
2. The class definition, at the top of the file.
3. Supporting functions below it, alphabetized.
4. Within the class: if it has enough methods that grouping helps, methods are organized into categories (defined per class, as needed), alphabetized within each category. Otherwise methods are alphabetized top to bottom.

**Command files:**

1. `@file` banner and imports.
2. Constants.
3. `buildInvokeCommand`, at the top of the functions.
4. Supporting functions below it, alphabetized.

Each command file exports `buildInvokeCommand` and returns a `Command`. It never calls `addCommand`.

**Plain utility modules** (no class, not a command file):

1. `@file` banner and imports.
2. Constants.
3. All functions alphabetized, top to bottom.

If a module grows large enough to warrant organization but not large enough to split, functions may be grouped into categories, alphabetized within each category, the same way as class methods.

**Constants:** alphabetized, unless one depends on another. A dependency is declared first, because constants are not hoisted.

## Import order

Blank line between groups.

1. `obsidian`
2. External modules, by importance: `react`, then `vitest`, then the rest.
3. Same-directory modules, alphabetized.
4. Other-directory modules, alphabetized.
5. Settings.
6. Utilities.
7. Types.

## Types and interfaces

If a type or interface is exported, it lives in `types.ts`. If `types.ts` becomes unwieldy, it becomes `types/` with members organized into modules by purpose and re-exported from a barrel, `index.ts`.

## List-breaking

Any list of more than two items is broken up, one item per line. This applies to function signatures, function calls, arrays, objects, imports, exports, and any other enumerated list.

## Formatting

- Spaces inside braces: `{ foo }`, not `{foo}`.
- Semicolons.
- Command names and menu titles use sentence case.
- Where the code already has a convention, follow it.

## Tests

Tests are co-located and follow the [Testing Specification](Tab%20Candy%20Testing%20Specification.md).