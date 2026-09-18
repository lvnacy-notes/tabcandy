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
	renderHook,
	waitFor
} from '@testing-library/react';
import { TFile } from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import {
	resolveActiveBackgroundPath,
	useBackground,
	useClock,
	useOverlayContrast,
} from './hooks';
import { DEFAULT_OVERLAY_COLOR } from '../services/overlayContrast';
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

describe('resolveActiveBackgroundPath', () => {
	it('returns null when there is no resolved background at all', () => {
		const app = createConfiguredApp({ files: {} });
		const settings = buildSettings({ backgroundTheme: BackgroundTheme.CUSTOM });

		expect(resolveActiveBackgroundPath(app, settings, null)).toBeNull();
	});

	it('returns customBackground for the Custom theme when a background is resolved', () => {
		const app = createConfiguredApp({
			files: { 'Backgrounds/sunset.png': '' },
		});
		const settings = buildSettings({
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/sunset.png',
		});

		const result = resolveActiveBackgroundPath(
			app,
			settings,
			'app://local/Backgrounds/sunset.png'
		);

		expect(result).toBe('Backgrounds/sunset.png');
	});

	it('returns the Local-theme candidate whose resolved URL matches the active background', () => {
		const app = createConfiguredApp({
			files: {
				'Backgrounds/one.png': '',
				'Backgrounds/two.png': '',
			},
		});
		const settings = buildSettings({
			backgroundTheme: BackgroundTheme.LOCAL,
			backgroundFiles: ['Backgrounds/one.png', 'Backgrounds/two.png'],
		});

		const result = resolveActiveBackgroundPath(
			app,
			settings,
			'app://local/Backgrounds/two.png'
		);

		expect(result).toBe('Backgrounds/two.png');
	});

	it('returns null for the Local theme when no candidate matches the active background', () => {
		const app = createConfiguredApp({
			files: { 'Backgrounds/one.png': '' },
		});
		const settings = buildSettings({
			backgroundTheme: BackgroundTheme.LOCAL,
			backgroundFiles: ['Backgrounds/one.png'],
		});

		const result = resolveActiveBackgroundPath(
			app,
			settings,
			'app://local/Backgrounds/nonexistent.png'
		);

		expect(result).toBeNull();
	});

	it('returns null for the transparent themes regardless of background', () => {
		const app = createConfiguredApp({ files: {} });
		const settings = buildSettings({ backgroundTheme: BackgroundTheme.TRANSPARENT });

		const result = resolveActiveBackgroundPath(app, settings, 'app://local/anything.png');

		expect(result).toBeNull();
	});
});

describe('useOverlayContrast', () => {
	afterEach(() => {
		cleanup();
	});

	function buildStore(overrides: Parameters<typeof buildSettings>[0] = {}) {
		return new SettingsStore(buildSettings(overrides), async () => {});
	}

	function getMtime(app: ReturnType<typeof createConfiguredApp>, path: string): number {
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new Error(`Expected '${path}' to resolve to a TFile in the fake vault`);
		}
		return file.stat.mtime;
	}

	it('returns no override when autoContrastOverlayText is off, even with an active background', () => {
		const app = createConfiguredApp({ files: { 'Backgrounds/sunset.png': '' } });
		const store = buildStore({
			autoContrastOverlayText: false,
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/sunset.png',
		});

		const { result } = renderHook(() =>
			useOverlayContrast(
				app,
				store,
				store.get(),
				'app://local/Backgrounds/sunset.png'
			)
		);

		expect(result.current).toBeNull();
	});

	it('returns no override when there is no active background', () => {
		const app = createConfiguredApp({ files: {} });
		const store = buildStore({
			autoContrastOverlayText: true,
			backgroundTheme: BackgroundTheme.TRANSPARENT,
		});

		const { result } = renderHook(() =>
			useOverlayContrast(app, store, store.get(), null)
		);

		expect(result.current).toBeNull();
	});

	it('returns a cached value without recomputing when the cache is fresh', async () => {
		const app = createConfiguredApp({ files: { 'Backgrounds/sunset.png': '' } });
		const mtime = getMtime(app, 'Backgrounds/sunset.png');
		const store = buildStore({
			autoContrastOverlayText: true,
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/sunset.png',
			overlayTextContrastCache: {
				'Backgrounds/sunset.png': {
					mtime,
					dominantColor: '#ff8800',
					overlayTextColor: '#123456',
				},
			},
		});
		const updateSpy = vi.spyOn(store, 'update');

		const { result } = renderHook(() =>
			useOverlayContrast(
				app,
				store,
				store.get(),
				'app://local/Backgrounds/sunset.png'
			)
		);

		await waitFor(() => expect(result.current).toBe('#123456'));
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it('recomputes and persists a result when there is no cache entry for the active file', async () => {
		const app = createConfiguredApp({ files: { 'Backgrounds/sunset.png': '' } });
		const mtime = getMtime(app, 'Backgrounds/sunset.png');
		const store = buildStore({
			autoContrastOverlayText: true,
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/sunset.png',
		});

		const { result } = renderHook(() =>
			useOverlayContrast(
				app,
				store,
				store.get(),
				'app://local/Backgrounds/sunset.png'
			)
		);

		// This environment has no real Canvas 2D implementation, so a
		// genuine recompute always resolves to the default overlay color
		// (see overlayContrast.test.ts) - which is exactly what makes this
		// a useful assertion here: it can only be this value if a fresh
		// computation actually ran, not a cache hit.
		await waitFor(() => expect(result.current).toBe(DEFAULT_OVERLAY_COLOR));
		expect(store.get().overlayTextContrastCache['Backgrounds/sunset.png']).toEqual({
			mtime,
			dominantColor: DEFAULT_OVERLAY_COLOR,
			overlayTextColor: DEFAULT_OVERLAY_COLOR,
		});
	});

	it('recomputes when the cached mtime no longer matches the file', async () => {
		const app = createConfiguredApp({ files: { 'Backgrounds/sunset.png': '' } });
		const mtime = getMtime(app, 'Backgrounds/sunset.png');
		const store = buildStore({
			autoContrastOverlayText: true,
			backgroundTheme: BackgroundTheme.CUSTOM,
			customBackground: 'Backgrounds/sunset.png',
			overlayTextContrastCache: {
				'Backgrounds/sunset.png': {
					mtime: mtime - 1000,
					dominantColor: '#ff8800',
					overlayTextColor: '#123456',
				},
			},
		});

		const { result } = renderHook(() =>
			useOverlayContrast(
				app,
				store,
				store.get(),
				'app://local/Backgrounds/sunset.png'
			)
		);

		// A stale cache entry ('#123456') would return synchronously; seeing
		// the fresh-recompute default confirms the mismatch triggered a
		// real recompute rather than trusting the stale entry.
		await waitFor(() => expect(result.current).toBe(DEFAULT_OVERLAY_COLOR));
		expect(store.get().overlayTextContrastCache['Backgrounds/sunset.png'].mtime).toBe(mtime);
	});
});