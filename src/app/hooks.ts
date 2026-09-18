import {
	App,
	TFile,
	normalizePath
} from 'obsidian';
import {
	useEffect,
	useMemo,
	useState
} from 'react';
import SettingsStore from '../settings/SettingsStore';
import {
	BackgroundTheme,
	Quote,
	TabCandySettings
} from '../types';
import { filterExistingFiles, getBackgroundResourcePath } from '../services/backgrounds';
import { getBookmarks } from '../services/bookmarks';
import { computeOverlayContrast, getFreshCacheEntry } from '../services/overlayContrast';
import getBackground from './utils/getBackground';
import getQuote from './utils/getQuote';
import { getTime } from './utils/time';

/**
 * Subscribes to a SettingsStore and keeps a piece of React state in sync
 * with it, unsubscribing on unmount.
 */
export const useSettings = (settingsStore: SettingsStore): TabCandySettings => {
	const [settings, setSettings] = useState<TabCandySettings>(
		settingsStore.get()
	);

	useEffect(() => settingsStore.subscribe(setSettings), [settingsStore]);

	return settings;
};

/**
 * Ticks once a second, returning the current time formatted per
 * `timeFormat`. The interval only restarts when `timeFormat` itself
 * changes, not on every unrelated settings update.
 */
export const useClock = (timeFormat: TabCandySettings['timeFormat']): string => {
	const [time, setTime] = useState(() => getTime(timeFormat));

	useEffect(() => {
		setTime(getTime(timeFormat));

		const timer = window.setInterval(() => {
			setTime(getTime(timeFormat));
		}, 1000);

		return () => window.clearInterval(timer);
	}, [timeFormat]);

	return time;
};

/**
 * Recomputes the displayed quote whenever either quote source changes.
 * customQuotes (hand-entered in the settings modal) and fileQuotes
 * (synced from the configured markdown file) are additive, not
 * either/or - both pools are merged before a quote is drawn.
 */
export const useQuote = (
	customQuotes: TabCandySettings['customQuotes'],
	fileQuotes: TabCandySettings['fileQuotes']
): Quote | null =>
	useMemo(
		() => getQuote([...customQuotes, ...fileQuotes]),
		[customQuotes, fileQuotes]
	);

/**
 * Resolves the active background URL for the current theme, merging
 * folder-synced (`backgroundFiles`) and individually-added
 * (`manualBackgroundFiles`) vault backgrounds into the pool
 * `BackgroundTheme.LOCAL` picks from.
 */
export const useBackground = (app: App, settings: TabCandySettings) => {
	const combinedLocalBackgrounds = useMemo(
		() =>
			[
				...settings.backgroundFiles,
				...settings.manualBackgroundFiles,
			].map((filePath) => getBackgroundResourcePath(app, filePath)),
		[app, settings.backgroundFiles, settings.manualBackgroundFiles]
	);

	const resolvedCustomBackground = useMemo(() => {
		if (!settings.customBackground) {
			return null;
		}
		const [existingCustomBackground] = filterExistingFiles(app, [
			settings.customBackground,
		]);
		return existingCustomBackground
			? getBackgroundResourcePath(app, existingCustomBackground)
			: null;
	}, [app, settings.customBackground]);

	return useMemo(
		() =>
			getBackground(
				settings.backgroundTheme,
				resolvedCustomBackground,
				combinedLocalBackgrounds
			),
		[
			settings.backgroundTheme,
			resolvedCustomBackground,
			combinedLocalBackgrounds,
		]
	);
};

/**
 * Recovers the vault-relative path of whichever background is actually
 * being displayed, given the already-resolved resource URL useBackground()
 * returned - rather than re-deriving "the active background" from
 * scratch, which for BackgroundTheme.LOCAL would mean re-running its
 * `Math.random()` pick a second time and risking a *different* file than
 * what's actually on screen. Matching backward against the same
 * candidate paths useBackground() drew from guarantees this can never
 * disagree with what's rendered.
 *
 * Returns null when there's no active background to key a cache entry
 * against at all: the transparent themes, or a background that didn't
 * resolve to anything (customBackground unset/deleted, no local files).
 */
export function resolveActiveBackgroundPath(
	app: App,
	settings: TabCandySettings,
	background: string | null
): string | null {
	if (!background) {
		return null;
	}

	if (settings.backgroundTheme === BackgroundTheme.CUSTOM) {
		return settings.customBackground || null;
	}

	if (settings.backgroundTheme === BackgroundTheme.LOCAL) {
		const candidates = [
			...settings.backgroundFiles,
			...settings.manualBackgroundFiles,
		];
		return (
			candidates.find(
				(path) => getBackgroundResourcePath(app, path) === background
			) ?? null
		);
	}

	return null;
}

/**
 * Auto-contrast overlay text: resolves the contrast-adjusted overlay text
 * color for whichever background image is currently active, computing it
 * fresh (via overlayContrast.ts) only when there's no cache entry for the
 * current file, or the file's mtime has moved past what was cached - a cache
 * hit returns synchronously, a miss triggers an async recompute and persists
 * the result for next time.
 *
 * Returns null (meaning: use the fixed default, not an override) when
 * autoContrastOverlayText is off, there's no active background to compute
 * against, or the active path doesn't actually resolve to a TFile (no
 * mtime to key a cache entry against - shouldn't normally happen, since
 * resolveActiveBackgroundPath() only ever returns a path useBackground()
 * has already confirmed exists, but this fails closed rather than
 * computing against something uncacheable).
 */
export const useOverlayContrast = (
	app: App,
	settingsStore: SettingsStore,
	settings: TabCandySettings,
	background: string | null
): string | null => {
	const [overlayTextColor, setOverlayTextColor] = useState<string | null>(null);

	const activePath = useMemo(
		() => resolveActiveBackgroundPath(app, settings, background),
		[
			app,
			settings.backgroundTheme,
			settings.customBackground,
			settings.backgroundFiles,
			settings.manualBackgroundFiles,
			background,
		]
	);

	useEffect(() => {
		if (!settings.autoContrastOverlayText || !activePath) {
			setOverlayTextColor(null);
			return;
		}

		const file = app.vault.getAbstractFileByPath(normalizePath(activePath));
		if (!(file instanceof TFile)) {
			setOverlayTextColor(null);
			return;
		}

		const cached = getFreshCacheEntry(
			settings.overlayTextContrastCache,
			activePath,
			file.stat.mtime
		);
		if (cached) {
			setOverlayTextColor(cached.overlayTextColor);
			return;
		}

		let cancelled = false;
		void computeOverlayContrast(getBackgroundResourcePath(app, activePath)).then(
			(result) => {
				if (cancelled) {return;}
				setOverlayTextColor(result.overlayTextColor);
				void settingsStore.update({
					overlayTextContrastCache: {
						...settingsStore.get().overlayTextContrastCache,
						[activePath]: { mtime: file.stat.mtime, ...result },
					},
				});
			}
		);

		return () => {
			cancelled = true;
		};
	}, [
		app,
		settingsStore,
		settings.autoContrastOverlayText,
		settings.overlayTextContrastCache,
		activePath,
	]);

	return overlayTextColor;
};

/**
 * The five most recently modified markdown files in the vault. Recomputed
 * on every render rather than memoized: `app.vault.getAllLoadedFiles()`
 * has no stable reference to memoize against, and there's no vault-event
 * subscription driving a real cache invalidation here.
 */
export const useRecentFiles = (app: App): TFile[] => {
	const files = app.vault
		.getAllLoadedFiles()
		.filter(
			(file): file is TFile =>
				file instanceof TFile && file.extension === 'md'
		);

	files.sort((a, b) => b.stat.mtime - a.stat.mtime);

	return files.slice(0, 5);
};

/**
 * The first five bookmarked files, per settings (all bookmarks, or scoped
 * to one group), via the guarded Bookmarks adapter in
 * `src/services/bookmarks.ts`.
 */
export const useBookmarks = (
	app: App,
	settings: TabCandySettings
): TFile[] => {
	return useMemo(
		() => getBookmarks(app, settings).slice(0, 5),
		[app, settings]
	);
};