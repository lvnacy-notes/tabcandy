/** @file React hooks for the new tab and the Cluster sidebar. */
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
import { filterExistingFiles, getBackgroundResourcePath } from '../newtab/backgrounds';
import { getBookmarks } from '../newtab/bookmarks';
import { computeOverlayContrast, getFreshCacheEntry } from '../newtab/overlayContrast';
import SettingsStore from '../settings/SettingsStore';
import getBackground from './utils/getBackground';
import getQuote from './utils/getQuote';
import { getTime } from './utils/time';
import {
	BackgroundTheme,
	Quote,
	TabCandySettings
} from '../types';

/**
 * Tracks a SettingsStore's current settings, subscribing on mount and unsubscribing on unmount.
 *
 * @param settingsStore - The store to track.
 * @returns The current settings.
 */
export const useSettings = (settingsStore: SettingsStore): TabCandySettings => {
	const [settings, setSettings] = useState<TabCandySettings>(
		settingsStore.get()
	);

	useEffect(() => settingsStore.subscribe(setSettings), [settingsStore]);

	return settings;
};

/**
 * Tracks the current time, formatted per `timeFormat` and refreshed every second. Restarts only when `timeFormat` changes.
 *
 * @param timeFormat - The display format.
 * @returns The formatted time.
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
 * Draws one quote from `customQuotes` and `fileQuotes` combined, redrawing only when either changes.
 *
 * @param customQuotes - Quotes entered in settings.
 * @param fileQuotes - Quotes synced from the quotes file.
 * @returns The quote, or null when there are none.
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
 * Resolves the background URL for the current theme. `BackgroundTheme.LOCAL` draws from the folder-synced and manually added vault backgrounds combined.
 *
 * @param app - The Obsidian app.
 * @param settings - Tab Candy settings.
 * @returns The background URL, or null when the theme has none.
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
 * Finds the vault-relative path of the displayed background by matching its resolved URL against the candidate paths for the current theme.
 *
 * @param app - The Obsidian app.
 * @param settings - Tab Candy settings.
 * @param background - The resolved background URL.
 * @returns The path, or null when there is no active background.
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
 * Resolves the overlay text color for the active background. A cache entry that is current for the file's mtime is returned synchronously. Otherwise the color is recomputed and cached.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the contrast cache.
 * @param settings - Tab Candy settings.
 * @param background - The resolved background URL.
 * @returns The color, or null when auto-contrast is off, there is no active background, or the background's file cannot be resolved.
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
		let blobUrl: string | null = null;
		void app.vault
			.readBinary(file)
			.then((buf) => {
				blobUrl = URL.createObjectURL(new Blob([buf]));
				return computeOverlayContrast(blobUrl);
			})
			.finally(() => {
				if (blobUrl) {URL.revokeObjectURL(blobUrl);}
			})
			.catch((error: unknown) => {
				console.warn(`Tab Candy: could not read ${activePath} for overlay contrast`, error);
				return null;
			})
			.then(
				(result) => {
					if (cancelled || !result) {return;}
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
 * Lists the five most recently modified markdown files, recomputed on every render.
 *
 * @param app - The Obsidian app.
 * @returns Up to five files, newest first.
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
 * Reads the first five bookmarked files, from all bookmarks or from one
 * group per settings.
 *
 * @param app - The Obsidian app.
 * @param settings - Tab Candy settings.
 * @returns Up to five bookmarked files.
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

/**
 * Counts vault `create`, `delete` and `rename` events, so a component
 * re-renders when whether a file exists may have changed. Unsubscribes on
 * unmount.
 *
 * @param app - The Obsidian app.
 * @returns The number of events seen since mount.
 */
export const useVaultRevision = (app: App): number => {
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		/** Counts one vault event. */
		const bump = (): void => {
			setRevision((current) => current + 1);
		};
		const refs = [
			app.vault.on('create', bump),
			app.vault.on('delete', bump),
			app.vault.on('rename', bump),
		];

		return () => {
			for (const ref of refs) {
				app.vault.offref(ref);
			}
		};
	}, [app]);

	return revision;
};