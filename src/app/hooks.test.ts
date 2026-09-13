import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { act } from 'react';
import {
	cleanup,
	renderHook
} from '@testing-library/react';
import { useBackground, useClock } from './hooks';
import { BackgroundTheme, TIME_FORMAT } from '../types';
import { buildSettings, createConfiguredApp } from '../test/fakes';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// useClock starts a real `window.setInterval(..., 1000)` - previously
// only exercised incidentally by tests that mount the full App, where
// whether the 1-second tick ever actually fires depends on real
// wall-clock timing during the test run. That's what caused the Coverage
// Ratchet's branch-coverage numbers to swing between runs with zero
// source changes (see REFACTOR-DECISIONS.md). Fake timers make the tick
// deterministic instead of a race, and let it actually be tested rather
// than just occasionally covered by accident.

describe('useClock', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('returns the current time immediately on mount', () => {
		vi.setSystemTime(new Date(2026, 0, 1, 14, 5));

		const { result } = renderHook(() => useClock(TIME_FORMAT.TWENTY_FOUR_HOUR));

		expect(result.current).toBe('14:05');
	});

	it('does not tick before a full second has elapsed', () => {
		vi.setSystemTime(new Date(2026, 0, 1, 14, 5, 0));
		const { result } = renderHook(() => useClock(TIME_FORMAT.TWENTY_FOUR_HOUR));

		act(() => {
			vi.setSystemTime(new Date(2026, 0, 1, 14, 5, 30));
			vi.advanceTimersByTime(500);
		});

		expect(result.current).toBe('14:05');
	});

	it('ticks once a second, reflecting the clock as it advances', () => {
		vi.setSystemTime(new Date(2026, 0, 1, 14, 5, 59));
		const { result } = renderHook(() => useClock(TIME_FORMAT.TWENTY_FOUR_HOUR));
		expect(result.current).toBe('14:05');

		act(() => {
			vi.setSystemTime(new Date(2026, 0, 1, 14, 6, 0));
			vi.advanceTimersByTime(1000);
		});

		expect(result.current).toBe('14:06');
	});

	it('restarts the interval and re-reads the clock immediately when timeFormat changes', () => {
		vi.setSystemTime(new Date(2026, 0, 1, 14, 5));
		const { result, rerender } = renderHook(
			({ timeFormat }) => useClock(timeFormat),
			{ initialProps: { timeFormat: TIME_FORMAT.TWENTY_FOUR_HOUR } }
		);
		expect(result.current).toBe('14:05');

		rerender({ timeFormat: TIME_FORMAT.TWELVE_HOUR });

		expect(result.current).toBe('2:05');
	});

	it('does not restart the interval on an unrelated re-render', () => {
		vi.setSystemTime(new Date(2026, 0, 1, 14, 5, 0));
		const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
		const { rerender } = renderHook(
			({ timeFormat }) => useClock(timeFormat),
			{ initialProps: { timeFormat: TIME_FORMAT.TWENTY_FOUR_HOUR } }
		);

		rerender({ timeFormat: TIME_FORMAT.TWENTY_FOUR_HOUR });

		expect(clearIntervalSpy).not.toHaveBeenCalled();
	});

	it('clears the interval on unmount rather than leaking it', () => {
		vi.setSystemTime(new Date(2026, 0, 1, 14, 5, 0));
		const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
		const { unmount } = renderHook(() => useClock(TIME_FORMAT.TWENTY_FOUR_HOUR));

		unmount();

		expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
	});
});

// customBackground scope-tightening: it moved from an unvalidated raw
// string (a literal URL, potentially remote) to a vault-relative path
// resolved the same defensive way as manualBackgroundFiles/
// backgroundFiles - filtered against the vault before being turned into
// a resource URL, so a since-deleted/renamed/never-existed file falls
// back to "no background" (Testing Specification's "Background
// resolution degrades gracefully" load-bearing behavior) instead of a
// broken image with no signal anything's wrong.
describe('useBackground', () => {
	afterEach(() => {
		cleanup();
	});

	it('resolves customBackground to a resource URL when the file exists in the vault', () => {
		const app = createConfiguredApp({
			files: { 'Backgrounds/sunset.png': '' },
		});
		const settings = buildSettings({
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/sunset.png',
		});

		const { result } = renderHook(() => useBackground(app, settings));

		expect(result.current).toBe('app://local/Backgrounds/sunset.png');
	});

	it('falls back to no background when customBackground points to a file that no longer exists', () => {
		const app = createConfiguredApp({ files: {} });
		const settings = buildSettings({
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/deleted.png',
		});

		const { result } = renderHook(() => useBackground(app, settings));

		expect(result.current).toBeNull();
	});

	it('falls back to no background when customBackground is unset', () => {
		const app = createConfiguredApp({ files: {} });
		const settings = buildSettings({
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: '',
		});

		const { result } = renderHook(() => useBackground(app, settings));

		expect(result.current).toBeNull();
	});
});