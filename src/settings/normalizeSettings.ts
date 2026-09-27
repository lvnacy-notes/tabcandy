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
 * Bumped whenever normalizeSettings()'s handling of a field changes in a way
 * that matters (a field is renamed, restructured, or gains a new required
 * shape). Stamped onto every settings object that passes through
 * normalizeSettings(), including a first-run install with no data.json at all,
 * so future normalization logic can branch on "what version did this data last
 * get normalized as" rather than guessing from shape.
 */
export const CURRENT_SETTINGS_VERSION = 1;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isValidSearchProvider(value: unknown): value is SearchProvider {
	return (
		isPlainObject(value) &&
		typeof value.command === 'string' &&
		typeof value.display === 'string'
	);
}

export function isValidCustomQuote(value: unknown): value is CustomQuote {
	return (
		isPlainObject(value) &&
		typeof value.text === 'string' &&
		typeof value.author === 'string'
	);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

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
 * Unlike the array fields above (dropped wholesale if any one entry is
 * malformed), a malformed cache entry is dropped individually rather than
 * invalidating the whole cache - it's an object keyed by vault path, not
 * an ordered list, so one bad entry says nothing about the trustworthiness
 * of the others.
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
 * Merge loaded plugin data with DEFAULT_SETTINGS and validate every field
 * against its expected type/enum/shape before trusting it. Anything
 * missing, malformed, or of the wrong type falls back to the default for
 * that field rather than propagating bad data into the running plugin -
 * enum values and provider objects are validated when loaded from data.json.
 *
 * Pure: no Obsidian API access, no side effects, safe to unit test with
 * plain objects.
 */
export function normalizeSettings(raw: unknown): TabCandySettings {
	const data = isPlainObject(raw) ? raw : {};
	const normalized: TabCandySettings = { ...DEFAULT_SETTINGS };

	/**
     * Plain strings and booleans: pass the loaded value through only if
	 * it's actually the type the field is supposed to be, otherwise keep
	 * the default rather than trusting whatever data.json contains.
     */
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

	/**
     * Enum-backed fields: validate against the enum instead of trusting
	 * whatever string happens to be on disk (a hand-edited data.json, an
	 * old enum value from a since-renamed member, etc).
	 */
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

	/**
     * Arrays: only trust them if every entry is actually shaped right.
	 * An empty array is always a safe fallback (matches DEFAULT_SETTINGS),
	 * so a malformed array is dropped wholesale rather than partially kept.
     */
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

	/**
     * Search providers: fall back to the built-in provider wholesale
	 * rather than trying to patch a half-malformed object - a provider
	 * missing its `command` is unusable regardless of what else it has.
	 */
	if (isValidSearchProvider(data.topLeftSearchProvider)) {
		normalized.topLeftSearchProvider = data.topLeftSearchProvider;
	}
	if (isValidSearchProvider(data.inlineSearchProvider)) {
		normalized.inlineSearchProvider = data.inlineSearchProvider;
	}

	/**
     * Overlay text contrast cache: always run, not gated behind a typeof or
     * isArray check like the fields above, since it needs to drop individual
     * malformed entries rather than fall back to the default wholesale. See
	 * normalizeOverlayTextContrastCache(). This degrades to {}, matching
     * DEFAULT_SETTINGS for a missing or non-object field on its own.
	 */
	normalized.overlayTextContrastCache = normalizeOverlayTextContrastCache(
		data.overlayTextContrastCache
	);

	normalized.settingsVersion = CURRENT_SETTINGS_VERSION;

	return normalized;
}