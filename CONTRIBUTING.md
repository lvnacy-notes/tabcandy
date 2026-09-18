
> [!warning] TAB CANDY IS NOT ACCEPTING PRs AT THIS TIME
> If you discover a bug or have a feature request, please raise an [issue](https://github.com/lvnacy-notes/tabcandy/issues/new). This notice will be updated if Tab Candy begins accepting pull requests. The following contributor guidelines will apply if Tab Candy opens to outside contributions.

---

Thank you for your interest in contributing to this codebase! You can point Obsidian to open this repo as a vault and read the docs there, where it may be a little more comfortable to do so. This provides a great visual testing environment too: just copy the build output to `.obsidian/plugins/tabcandy/` and kick the tires on what you've built! More on this below.

Most of the tooling is in place and configured for Obsidian plugin development. Getting up and running is the easy part, detailed in [[#Getting started]]. The real effort is adhering to the Code Style Guidelines and understanding the Testing Suite, which are not conventional!

## Contents
---

```toc
```

## Getting started
---

This is the easy part. Fork the repo, clone your fork locally, then:

```bash
pnpm install
pnpm test           # run the test suite
pnpm test:coverage  # run tests with a coverage report
pnpm lint           # lint
pnpm typecheck      # typecheck
pnpm build          # production build → dist/
```

This will give you working instance of *Tab Candy*. Easy peasy. Some caveats:

*Tab Candy* development requires Node 24 or newer, and [pnpm](https://pnpm.io/) - the exact version is pinned in `package.json`'s `packageManager` field (currently `12.4.1`), which is also what CI reads to set up `pnpm`.

## Developing Tab Candy
---

### Code Style Guidelines

`eslint` addresses most of what Obsidian demands of their plugins. However, much like Prettier, I too am opinionated, and have some additional guidelines when writing code:

- `main.ts` is plugin lifecycle ONLY. Abstract everything else. PRs packing `main.ts` with functions that can be removed to a service module will be closed without additional review.
- One class per module. If a class requires supporting functions outside of the class, they may be included below the class, or a separate utility module can be created to support the class. Make use of the `src/services` directory as needed.
- PascalCase for modules exporting a class; camelCase for all other modules.
- If a list has more than two items, put each item on a separate line. This includes import and export statements, function signatures and function calls, object variable declarations, etc.
- Yes, semicolons.
- Tests are colocated. See [[#The Testing Suite]].
- Is there an existing convention in the code? Follow it.

Adhering to this set of conventions means far more than just prompting an LLM and submitting its output. It requires you to actually read and understand the code being output if you are using LLMs to code with. Which brings us to ...

### Code Review

If you submit a PR to the project, I will expect you to walk the maintainers through the code. You should know what each function does and how they integrate with the whole before you consider submitting it. Use the LLM if you choose, but understand what it's doing.

### The Coverage Ratchet

Coverage can't drop below whatever's already committed in `.coverage/baseline.json`, checked by `.coverage/check-coverage-ratchet.js`. There's no fixed percentage target to hit - the floor just isn't allowed to move backward, without good reason. PRs where the floor is lowered should describe in detail why. Raising it is a manual step: edit `baseline.json` by hand, in the same PR that raised coverage, with numbers taken from a real `pnpm test:coverage` run.

### The Testing Suite

Testing here is unconventional. Most projects adhere to a code coverage percentage. This project adhere's to a code coverage baseline where tests are written under specific circumstances. A PR whose tests do not adhere to the [[Tab Candy Testing Specification|Testing Specification]] will be closed without further review. Read the spec, follow the spec. Simple.

### What a PR needs to pass

CI (`.github/workflows/ci.yaml`) runs on every PR, in this order: install, typecheck, lint, test with coverage, Coverage Ratchet, build. All of it has to pass for the PR to merge.

### The devcontainer

[Container Image](https://hub.docker.com/repository/docker/lvnacy/node-devcontainer/general) | [Dockerfile Repository](https://github.com/lvnacy-docker/node-devcontainer)

This project ships with a Dev Container config for use with [VS Code's Dev Container](https://code.visualstudio.com/docs/devcontainers/create-dev-container) system. If you do not like to install software development tooling on your local machine, this provides you with a consistent development environment through Docker. You will need the Docker Engine and VS Code installed in order to use the devcontainer.

When using the devcontainer:
1. Open VS Code
2. Write your code
3. Use the `Dev Container: Rebuild without Cache and Reopen in Container` command
4. Run the linter, test suite, coverage script, and build

Due to how the container is set up to manage the `pnpm` store, you will need to remove `node_modules` prior to opening the codebase inside the container. Failure to do so will result in `pnpm` errors.

You can find the source image for the dev container on Docker Hub [here](https://hub.docker.com/repository/docker/lvnacy/node-devcontainer/general).
You can review the image's Dockerfile [here](https://github.com/lvnacy-docker/node-devcontainer).

## Obsidian Plugin Caveats
---

The following are solutions that have arisen over the course of development. Some of the moving parts are not conventional Obsidian plugin development. Their appropriate counterparts are listed below.
### DOM element creation

Use Obsidian's DOM helpers (`createEl`, `createDiv`, `createSpan`, etc.) rather than `document.createElement`. This is enforced by `eslint-plugin-obsidianmd`'s `obsidianmd/prefer-create-el` rule, and that rule cannot be suppressed inline anywhere in this repo—`eslint-comments/no-restricted-disable` blocks disabling any `obsidianmd/*` rule, including a targeted one-line disable).

#### Detached elements (never attached to the live document)

Some elements are built purely as scratch space and must never touch the real document - an offscreen canvas used only to sample pixel data, for example. `document.createElement` still works for this, but trips the `prefer-create-el` rule with no way to suppress it.

Use `createFragment().createEl(tag)` instead:

```ts
const canvas = createFragment().createEl('canvas');
```

- `createEl` is declared on Obsidian's global `Node` interface, and `DocumentFragment` extends `Node`—a fragment gets `createEl` for free, no separate API to look up.
- A `DocumentFragment` is never part of the live document by definition, so the created element is genuinely detached (`element.isConnected === false`)—the same guarantee `document.createElement` provides.
- This satisfies the lint rule for real, not by working around it - we're using the Obsidian-provided helper.

Confirmed working against this repo's actual toolchain, including inside Vitest via `obsidian-test-mocks`, which polyfills both the global `createFragment()` function and `Node.prototype.createEl`, in both type-checks and runtime behavior.

If your editor reports "Cannot find name 'createFragment'" right after adding this, that's very likely a stale TypeScript server, not a real error—restart the TS server before assuming something's wrong with the code. `pnpm typecheck` and `pnpm typecheck:fast` are the source of truth here, not the editor's inline squiggles.

**More will be added as challenges and their solutions arise**