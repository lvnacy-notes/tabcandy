/** @file Tests for the app hooks. */
import { TFile } from 'obsidian';
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
	resolveActiveBackgroundPath,
	useBackground,
	useClock,
	useOverlayContrast,
	useVaultRevision,
} from './hooks';
import { DEFAULT_OVERLAY_COLOR } from '../newtab/overlayContrast';
import {
	cleanup,
	renderHook,
	waitFor
} from '@testing-library/react';
import {
	buildSettings,
	createConfiguredApp,
	getExistingFile
} from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';
import { BackgroundTheme, TIME_FORMAT } from '../types';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;


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

	/**
	 * Builds a store over default settings with `overrides` applied.
	 *
	 * @param overrides - Settings to replace.
	 * @returns The store.
	 */
	function buildStore(overrides: Parameters<typeof buildSettings>[0] = {}) {
		return new SettingsStore(buildSettings(overrides), async () => {});
	}

	/**
	 * Reads a vault file's mtime.
	 *
	 * @param app - The app.
	 * @param path - Vault-relative path.
	 * @returns The mtime.
	 */
	function getMtime(app: ReturnType<typeof createConfiguredApp>, path: string): number {
		const file = app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new Error(`Expected '${path}' to resolve to a TFile in the fake vault`);
		}
		return file.stat.mtime;
	}

	/**
	 * Stubs binary reads and blob URLs on the app.
	 *
	 * @param app - The app.
	 */
	function stubBinaryRead(app: ReturnType<typeof createConfiguredApp>) {
		vi.spyOn(app.vault, 'readBinary').mockResolvedValue(new ArrayBuffer(8));
		URL.createObjectURL = vi.fn(() => 'blob:tabcandy-test');
		URL.revokeObjectURL = vi.fn();
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
		stubBinaryRead(app);
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

		await waitFor(() => expect(result.current).toBe(DEFAULT_OVERLAY_COLOR));
		expect(store.get().overlayTextContrastCache['Backgrounds/sunset.png']).toEqual({
			mtime,
			dominantColor: DEFAULT_OVERLAY_COLOR,
			overlayTextColor: DEFAULT_OVERLAY_COLOR,
		});
	});

	it('recomputes when the cached mtime no longer matches the file', async () => {
		const app = createConfiguredApp({ files: { 'Backgrounds/sunset.png': '' } });
		stubBinaryRead(app);
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

		await waitFor(() => expect(result.current).toBe(DEFAULT_OVERLAY_COLOR));
		expect(store.get().overlayTextContrastCache['Backgrounds/sunset.png'].mtime).toBe(mtime);
	});
});

describe('useVaultRevision', () => {
	it('starts at zero', () => {
		const app = createConfiguredApp();

		const { result } = renderHook(() => useVaultRevision(app));

		expect(result.current).toBe(0);
	});

	it('increases when a file is created', async () => {
		const app = createConfiguredApp();
		const { result } = renderHook(() => useVaultRevision(app));

		await act(async () => {
			await app.vault.create('a.md', '');
		});

		expect(result.current).toBe(1);
	});

	it('increases when a file is deleted', async () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const file = getExistingFile(app, 'a.md');
		const { result } = renderHook(() => useVaultRevision(app));

		await act(async () => {
			await app.fileManager.trashFile(file);
		});

		expect(result.current).toBe(1);
	});

	it('increases when a file is renamed', async () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const file = getExistingFile(app, 'a.md');
		const { result } = renderHook(() => useVaultRevision(app));

		await act(async () => {
			if (file instanceof TFile) {
				await app.vault.rename(file, 'b.md');
			}
		});

		expect(result.current).toBe(1);
	});

	it('stops listening when unmounted', () => {
		const app = createConfiguredApp();
		const offref = vi.spyOn(app.vault, 'offref');
		const { unmount } = renderHook(() => useVaultRevision(app));

		unmount();

		expect(offref).toHaveBeenCalledTimes(3);
	});
});