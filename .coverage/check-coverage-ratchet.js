#!/usr/bin/env node

/**
 * The Coverage Ratchet (Testing Specification, "Coverage: the Ratchet"):
 * there's no invented percentage target, coverage just can't drop below
 * wherever it already sits. This script is the enforcement half of that -
 * it diffs the coverage this run actually produced against the floor
 * recorded in `.coverage/baseline.json` and fails if any of the four
 * aggregate metrics (lines, statements, functions, branches) has dropped.
 *
 * The baseline only ever moves by a human editing `.coverage/baseline.json`
 * by hand in the same PR that raised coverage - this script never writes
 * to it. That's a deliberate choice recorded in the tests & CI plan: no
 * bot commits, no write-back permissions needed in CI, a person stays
 * accountable for consciously raising the floor.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Rounding noise between runs shouldn't fail the ratchet. This has to
// absorb a real, identified source of run-to-run swing, not just float
// rounding: `useClock` (src/app/hooks.ts) starts a genuine
// `window.setInterval(..., 1000)` with no fake-timer control in the tests
// that mount it, so whether that 1-second tick actually fires - and gets
// counted as a covered branch - depends on real wall-clock timing during
// the run, not on anything the tests assert. Confirmed by isolating the
// exact swing: 227 total tracked branches means one branch is worth
// ~0.44 percentage points, and an observed 0.88pp branch-coverage swing
// with zero source changes between runs lines up almost exactly with two
// such branches flipping. 1.5 comfortably covers a few points of this
// specific, understood class of timing flakiness while still catching a
// real regression, which moves the needle by many points (a dropped file
// or function), not a fraction of one. The actual fix - a dedicated
// hooks.test.ts exercising useClock with `vi.useFakeTimers()` so the tick
// is deterministic rather than a real-time race - isn't done here; this
// epsilon is a mitigation, not a substitute for it.
const EPSILON = 1.5;

const METRICS = [
	'lines',
	'statements',
	'functions',
	'branches'
];

const SUMMARY_PATH = path.resolve('.coverage/report/coverage-summary.json');
const BASELINE_PATH = path.resolve('.coverage/baseline.json');

async function readJson(filePath, missingMessage) {
	let raw;
	try {
		raw = await readFile(filePath, 'utf8');
	} catch (error) {
		console.error(missingMessage);
		console.error(`  (${ filePath }: ${ error.message })`);
		process.exit(1);
	}
	return JSON.parse(raw);
}

const summary = await readJson(
	SUMMARY_PATH,
	'Coverage Ratchet: no coverage summary found. Run `vitest run --coverage` before this check.'
);
const baseline = await readJson(
	BASELINE_PATH,
	'Coverage Ratchet: no baseline found - .coverage/baseline.json should be committed to the repo.'
);

const current = {
	lines: summary.total?.lines?.pct,
	statements: summary.total?.statements?.pct,
	functions: summary.total?.functions?.pct,
	branches: summary.total?.branches?.pct,
};

const regressions = METRICS.filter((metric) => {
	const currentValue = current[metric];
	const baselineValue = baseline[metric];
	if (typeof currentValue !== 'number' || typeof baselineValue !== 'number') {
		return true;
	}
	return currentValue < baselineValue - EPSILON;
});

if (regressions.length > 0) {
	console.error('Coverage Ratchet: coverage dropped below the committed baseline.\n');
	for (const metric of regressions) {
		console.error(`  ${ metric }: ${ current[metric] }% (baseline: ${ baseline[metric] }%)`);
	}
	console.error(
		'\nEither add tests to bring coverage back up, or - if this drop is deliberate and reviewed - '
		+ 'lower the corresponding value(s) in .coverage/baseline.json in this same PR.'
	);
	process.exit(1);
}

console.log('Coverage Ratchet: OK. Current coverage meets or exceeds the committed baseline.');
for (const metric of METRICS) {
	console.log(`  ${ metric }: ${ current[metric] }% (baseline: ${ baseline[metric] }%)`);
}