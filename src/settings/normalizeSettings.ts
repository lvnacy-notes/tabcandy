import { DEFAULT_SETTINGS } from './defaultSettings';
import {
	isEnumValue,
	isHexColor,
	isRecord
} from '../utils/typeGuards';
import {
	BOOKMARK_SOURCE,
	BackgroundTheme,
	CustomQuote,
	OverlayContrastCacheEntry,
	SearchProvider,
	TIME_FORMAT,
	TabCandyCluster,
	TabCandyClusters,
	TabCandySettings,
	UNTITLED_CLUSTER_NAME,
} from '../types';

/**
 * Version stamped onto every normalized settings object. Bump it when a
 * field is renamed or restructured.
 *
 * 2: added `clusters`, `keepPairedClustersInSync`, `jumpToExistingCluster`.
 */
export const CURRENT_SETTINGS_VERSION = 2;

/**
 * Narrows to a non-null object. Arrays pass; use `isRecord()` to exclude them.
 *
 * @param value - Value to test.
 * @returns True when `value` is a non-null object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Tests for a valid search provider.
 *
 * @param value - Value to test.
 * @returns True when `value` has string `command` and `display` fields.
 */
function isValidSearchProvider(value: unknown): value is SearchProvider {
	return (
		isPlainObject(value) &&
		typeof value.command === 'string' &&
		typeof value.display === 'string'
	);
}

/**
 * Tests for a valid custom quote.
 *
 * @param value - Value to test.
 * @returns True when `value` has string `text` and `author` fields.
 */
export function isValidCustomQuote(value: unknown): value is CustomQuote {
	return (
		isPlainObject(value) &&
		typeof value.text === 'string' &&
		typeof value.author === 'string'
	);
}

/**
 * Tests for an array of strings.
 *
 * @param value - Value to test.
 * @returns True when `value` is an array whose every item is a string.
 */
function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Tests for a valid overlay contrast cache entry.
 *
 * @param value - Value to test.
 * @returns True when `value` has a numeric `mtime` and string `dominantColor` and `overlayTextColor`.
 */
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
 * Keeps the valid entries of the overlay contrast cache, dropping malformed
 * ones individually.
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
 * Validates one stored Cluster field by field. `id` always comes from the
 * storage key, and an invalid field falls back on its own. `pairedWith` is
 * checked for type only; `normalizeClusters()` checks the partner.
 *
 * @param id - Key the Cluster is stored under.
 * @param raw - Untrusted stored value.
 * @returns The normalized Cluster, or null when `raw` isn't an object.
 */
function normalizeCluster(id: string, raw: unknown): TabCandyCluster | null {
	if (!isRecord(raw)) {
		return null;
	}

	const cluster: TabCandyCluster = {
		id,
		name: typeof raw.name === 'string' ? raw.name : UNTITLED_CLUSTER_NAME,
		// Non-string entries are dropped individually.
		members: Array.isArray(raw.members)
			? raw.members.filter((member): member is string => typeof member === 'string')
			: [],
		lastTouchedAt:
			typeof raw.lastTouchedAt === 'number' && Number.isFinite(raw.lastTouchedAt)
				? raw.lastTouchedAt
				: 0,
		pairedWith: typeof raw.pairedWith === 'string' ? raw.pairedWith : null,
	};

	if (isHexColor(raw.flavor)) {
		cluster.flavor = raw.flavor;
	}
	if (isRecord(raw.layoutSnapshot)) {
		cluster.layoutSnapshot = raw.layoutSnapshot;
	}

	return cluster;
}

/**
 * Normalizes every stored Cluster, then unpairs any whose partner is
 * missing, is itself, or doesn't point back.
 *
 * @param value - Raw `clusters` value from loaded data.
 * @returns The valid Clusters keyed by id, or `{}` when `value` isn't an object.
 */
function normalizeClusters(value: unknown): TabCandyClusters {
	if (!isRecord(value)) {
		return {};
	}

	const read: TabCandyClusters = {};
	for (const [key, entry] of Object.entries(value)) {
		// Assigning to `__proto__` would replace the prototype instead of adding a key.
		if (key === '__proto__') {
			continue;
		}
		const cluster = normalizeCluster(key, entry);
		if (cluster !== null) {
			read[key] = cluster;
		}
	}

	const normalized: TabCandyClusters = {};
	for (const [key, cluster] of Object.entries(read)) {
		const partnerId = cluster.pairedWith;
		const isReciprocal =
			partnerId !== null &&
			partnerId !== key &&
			Boolean(Object.prototype.hasOwnProperty.call(read, partnerId)) &&
			read[partnerId].pairedWith === key;
		normalized[key] = isReciprocal ? cluster : { ...cluster, pairedWith: null };
	}
	return normalized;
}

/**
 * Merges loaded data over `DEFAULT_SETTINGS`, validating each field. A
 * missing or invalid field keeps its default. Pure.
 *
 * @param raw - Untrusted data from disk.
 * @returns Valid settings stamped with `CURRENT_SETTINGS_VERSION`.
 */
export function normalizeSettings(raw: unknown): TabCandySettings {
	const data = isPlainObject(raw) ? raw : {};
	const normalized: TabCandySettings = { ...DEFAULT_SETTINGS };

	/** Strings and booleans: accepted when the type matches. */
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
	if (typeof data.keepPairedClustersInSync === 'boolean') {
		normalized.keepPairedClustersInSync = data.keepPairedClustersInSync;
	}
	if (typeof data.jumpToExistingCluster === 'boolean') {
		normalized.jumpToExistingCluster = data.jumpToExistingCluster;
	}

	/** Enum fields: accepted when the value is a member of the enum. */
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

	/** Arrays: accepted when every entry is valid, otherwise dropped whole. */
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

	/** Search providers: a malformed provider is replaced by the default. */
	if (isValidSearchProvider(data.topLeftSearchProvider)) {
		normalized.topLeftSearchProvider = data.topLeftSearchProvider;
	}
	if (isValidSearchProvider(data.inlineSearchProvider)) {
		normalized.inlineSearchProvider = data.inlineSearchProvider;
	}

	/** Overlay contrast cache: bad entries drop individually. */
	normalized.overlayTextContrastCache = normalizeOverlayTextContrastCache(
		data.overlayTextContrastCache
	);

	/** Clusters: bad entries are repaired or dropped individually. */
	normalized.clusters = normalizeClusters(data.clusters);

	normalized.settingsVersion = CURRENT_SETTINGS_VERSION;

	return normalized;
}