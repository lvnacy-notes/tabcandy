import {
	BOOKMARK_SOURCE,
	BackgroundTheme,
	CustomQuote,
	SearchProvider,
	TIME_FORMAT,
	TabCandySettings,
} from '../types';
import isEnumValue from '../utils/isEnumValue';
import { OverlayContrastCacheEntry } from '../services/overlayContrast';
import { DEFAULT_SETTINGS } from './defaultSettings';

/**
 * Version stamped onto every normalized settings object, including a fresh
 * install. Bump it when a field is renamed or restructured, so later
 * normalization can branch on the version the data was last normalized at.
 */
export const CURRENT_SETTINGS_VERSION = 1;

/** Narrows to a non-null object so its properties can be read as `unknown`. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** True when `value` has string `command` and `display` fields. */
function isValidSearchProvider(value: unknown): value is SearchProvider {
	return (
		isPlainObject(value) &&
		typeof value.command === 'string' &&
		typeof value.display === 'string'
	);
}

/** True when `value` has string `text` and `author` fields. */
export function isValidCustomQuote(value: unknown): value is CustomQuote {
	return (
		isPlainObject(value) &&
		typeof value.text === 'string' &&
		typeof value.author === 'string'
	);
}

/** True when `value` is an array whose every item is a string. */
function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** True when `value` has a numeric `mtime` and string `dominantColor` and `overlayTextColor`. */
function isValidOverlayContrastCacheEntry(
	value: unknown
): value is OverlayContrastCacheEntry {
	return (
		isPlainObject(value) &&
		typeof value.mtime === 'number' &&
		typeof value.dominantColor === 'string' &&
		typeof value.overlayTextColor === 'string'
	);
}

/**
 * Keeps the valid entries of the overlay contrast cache. A malformed entry
 * is dropped on its own, not the whole cache.
 *
 * @param value - Raw cache value from loaded data.
 * @returns The valid entries, or `{}` when `value` isn't an object.
 */
function normalizeOverlayTextContrastCache(
	value: unknown
): Record<string, OverlayContrastCacheEntry> {
	if (!isPlainObject(value)) {
		return {};
	}

	const normalized: Record<string, OverlayContrastCacheEntry> = {};
	for (const [path, entry] of Object.entries(value)) {
		if (isValidOverlayContrastCacheEntry(entry)) {
			normalized[path] = entry;
		}
	}
	return normalized;
}

/**
 * Merges loaded plugin data over `DEFAULT_SETTINGS`, validating each field.
 * A missing, malformed, or wrongly typed field keeps its default. Pure: no
 * Obsidian API access or side effects.
 *
 * @param raw - Untrusted data from disk (anything, including `undefined`).
 * @returns Valid settings stamped with `CURRENT_SETTINGS_VERSION`.
 */
export function normalizeSettings(raw: unknown): TabCandySettings {
	const data = isPlainObject(raw) ? raw : {};
	const normalized: TabCandySettings = { ...DEFAULT_SETTINGS };

	/** Strings and booleans: accepted only if the type matches. */
	if (typeof data.replaceEmptyTabsWithTabCandy === 'boolean') {
		normalized.replaceEmptyTabsWithTabCandy =
			data.replaceEmptyTabsWithTabCandy;
	}
	if (typeof data.dashboardFocusesOpenTab === 'boolean') {
		normalized.dashboardFocusesOpenTab = data.dashboardFocusesOpenTab;
	}
	if (typeof data.customBackground === 'string') {
		normalized.customBackground = data.customBackground;
	}
	if (typeof data.backgroundsFolder === 'string') {
		normalized.backgroundsFolder = data.backgroundsFolder;
	}
	if (typeof data.showTopLeftSearchButton === 'boolean') {
		normalized.showTopLeftSearchButton = data.showTopLeftSearchButton;
	}
	if (typeof data.showTime === 'boolean') {
		normalized.showTime = data.showTime;
	}
	if (typeof data.showGreeting === 'boolean') {
		normalized.showGreeting = data.showGreeting;
	}
	if (typeof data.greetingText === 'string') {
		normalized.greetingText = data.greetingText;
	}
	if (typeof data.showInlineSearch === 'boolean') {
		normalized.showInlineSearch = data.showInlineSearch;
	}
	if (typeof data.showRecentFiles === 'boolean') {
		normalized.showRecentFiles = data.showRecentFiles;
	}
	if (typeof data.showBookmarks === 'boolean') {
		normalized.showBookmarks = data.showBookmarks;
	}
	if (typeof data.bookmarkGroup === 'string') {
		normalized.bookmarkGroup = data.bookmarkGroup;
	}
	if (typeof data.showQuote === 'boolean') {
		normalized.showQuote = data.showQuote;
	}
	if (typeof data.quotesFilePath === 'string') {
		normalized.quotesFilePath = data.quotesFilePath;
	}
	if (typeof data.autoContrastOverlayText === 'boolean') {
		normalized.autoContrastOverlayText = data.autoContrastOverlayText;
	}
	if (typeof data.closeTabsInFolderRecursive === 'boolean') {
		normalized.closeTabsInFolderRecursive = data.closeTabsInFolderRecursive;
	}
	if (typeof data.showRecentlyClosedTabs === 'boolean') {
		normalized.showRecentlyClosedTabs = data.showRecentlyClosedTabs;
	}
	if (typeof data.widenStackedTabPanes === 'boolean') {
		normalized.widenStackedTabPanes = data.widenStackedTabPanes;
	}

	/** Enum-backed fields: accepted only if the value is a member of the enum. */
	if (
		typeof data.backgroundTheme === 'string' &&
		isEnumValue(BackgroundTheme, data.backgroundTheme)
	) {
		normalized.backgroundTheme = data.backgroundTheme;
	}
	if (
		typeof data.timeFormat === 'string' &&
		isEnumValue(TIME_FORMAT, data.timeFormat)
	) {
		normalized.timeFormat = data.timeFormat;
	}
	if (
		typeof data.bookmarkSource === 'string' &&
		isEnumValue(BOOKMARK_SOURCE, data.bookmarkSource)
	) {
		normalized.bookmarkSource = data.bookmarkSource;
	}

	/** Arrays: accepted only if every entry is valid; otherwise dropped whole. */
	if (isStringArray(data.backgroundFiles)) {
		normalized.backgroundFiles = data.backgroundFiles;
	}
	if (isStringArray(data.manualBackgroundFiles)) {
		normalized.manualBackgroundFiles = data.manualBackgroundFiles;
	}
	if (Array.isArray(data.customQuotes) && data.customQuotes.every(isValidCustomQuote)) {
		normalized.customQuotes = data.customQuotes;
	}
	if (Array.isArray(data.fileQuotes) && data.fileQuotes.every(isValidCustomQuote)) {
		normalized.fileQuotes = data.fileQuotes;
	}

	/** Search providers: a malformed provider is replaced whole by the default. */
	if (isValidSearchProvider(data.topLeftSearchProvider)) {
		normalized.topLeftSearchProvider = data.topLeftSearchProvider;
	}
	if (isValidSearchProvider(data.inlineSearchProvider)) {
		normalized.inlineSearchProvider = data.inlineSearchProvider;
	}

	/** Overlay contrast cache: always normalized, so bad entries drop individually. */
	normalized.overlayTextContrastCache = normalizeOverlayTextContrastCache(
		data.overlayTextContrastCache
	);

	normalized.settingsVersion = CURRENT_SETTINGS_VERSION;

	return normalized;
}