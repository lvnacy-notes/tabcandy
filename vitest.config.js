import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		// The real `obsidian` package published to npm is a types-only shim
		// (`"main": ""`) — Obsidian itself supplies the runtime module at
		// plugin-load time. Vite's resolver chokes on that empty entry
		// before obsidian-test-mocks' `vi.mock('obsidian', ...)` ever gets a
		// chance to intercept the import, so we alias the bare specifier
		// straight to the mock package ourselves.
		alias: {
			obsidian: 'obsidian-test-mocks/obsidian',
		},
	},
	test: {
		environment: 'jsdom',
		// jsdom construction is expensive (~200-500ms) and the default pool
		// pays that cost once per test file. `vmThreads` amortizes it once
		// per worker while still giving every file its own fresh `window` -
		// `isolate: false` would be faster still, but shares module state
		// (e.g. obsidian-test-mocks' icon registry) across files in the same
		// worker, which this suite's tests don't assume. Cross-realm
		// `instanceof` against externalized packages is vmThreads' one known
		// risk; this suite has exactly one such check
		// (`components.test.tsx`'s `instanceof TFile`) and it holds up fine.
		pool: 'vmThreads',
		setupFiles: ['obsidian-test-mocks/vitest-setup'],
		include: ['src/**/*.test.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			reporter: [
				'text',
				'html',
				'json',
				'json-summary'
			],
			// Generated report output lives under the same .coverage/ dotdir
			// as the committed Ratchet baseline (.coverage/baseline.json), in
			// its own subfolder so the two never collide - this directory is
			// regenerated every run and gitignored; baseline.json is the one
			// thing under .coverage/ that's actually committed.
			reportsDirectory: '.coverage/report',
			// Scoped to application source under test - without this, v8's
			// default whole-project sweep pulls in root-level build tooling
			// (main.ts, esbuild.config.js, version-bump.js) and CI tooling
			// under .coverage/, none of which is unit-testable application
			// logic and none of which should move the Ratchet's baseline.
			include: ['src/**/*.{ts,tsx}'],
			// The Ratchet (Testing Specification, "Coverage: the Ratchet"):
			// no invented target, coverage just can't drop below wherever it
			// already sits. Thresholds start at 0 so the first real run
			// establishes the baseline rather than failing immediately on an
			// empty suite; the run-to-run comparison itself lives in
			// .coverage/check-coverage-ratchet.js against
			// .coverage/baseline.json, wired into CI (see
			// REFACTOR-IMPLEMENTATION-CHECKLIST.md §10).
			thresholds: {
				lines: 0,
				functions: 0,
				branches: 0,
				statements: 0,
			},
		},
	},
});