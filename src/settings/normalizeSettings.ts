/** @file Validates raw saved data into plugin settings. */
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

/** The keys of `TabCandySettings` whose value type is `Value`. */
type FieldsOf<Value> = { [Key in keyof TabCandySettings]: TabCandySettings[Key] extends Value ? Key : never }[keyof TabCandySettings];

/** Settings holding a boolean. */
type BooleanField = FieldsOf<boolean>;

/** Settings holding a string enum. Plain `string` fields are not enums. */
type EnumField = { [Key in keyof TabCandySettings]: string extends TabCandySettings[Key] ? never : TabCandySettings[Key] extends string ? Key : never }[keyof TabCandySettings];

/** Settings holding a plain string. */
type StringField = Exclude<FieldsOf<string>, EnumField>;

/** Every boolean setting. A new boolean setting that is missing here fails to compile. */
const BOOLEAN_FIELDS: Record<BooleanField, true> = {
	autoContrastOverlayText: true,
	closeTabsInFolderRecursive: true,
	dashboardFocusesOpenTab: true,
	jumpToExistingCluster: true,
	keepPairedClustersInSync: true,
	replaceEmptyTabsWithTabCandy: true,
	showBookmarks: true,
	showGreeting: true,
	showInlineSearch: true,
	showQuote: true,
	showRecentFiles: true,
	showRecentlyClosedTabs: true,
	showTime: true,
	showTopLeftSearchButton: true,
	widenStackedTabPanes: true,
};

/** Every enum setting with its enum. A new enum setting that is missing here, or paired with the wrong enum, fails to compile. */
const ENUM_FIELDS: { [Key in EnumField]: Record<string, TabCandySettings[Key]> } = {
	backgroundTheme: BackgroundTheme,
	bookmarkSource: BOOKMARK_SOURCE,
	timeFormat: TIME_FORMAT,
};

/** Every plain string setting. A new string setting that is missing here fails to compile. */
const STRING_FIELDS: Record<StringField, true> = {
	backgroundsFolder: true,
	bookmarkGroup: true,
	customBackground: true,
	greetingText: true,
	quotesFilePath: true,
};

/**
 * Copies a field onto the settings when its raw value passes the check.
 *
 * @param target - The settings being built.
 * @param key - The field.
 * @param value - The raw value.
 * @param isValid - Tests the raw value.
 */
function copyField<Key extends keyof TabCandySettings>(
	target: TabCandySettings,
	key: Key,
	value: unknown,
	isValid: (value: unknown) => value is TabCandySettings[Key]
): void {
	if (isValid(value)) {
		target[key] = value;
	}
}

/**
 * Tests for a boolean.
 *
 * @param value - Value to test.
 * @returns True when `value` is a boolean.
 */
function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * Tests for a string.
 *
 * @param value - Value to test.
 * @returns True when `value` is a string.
 */
function isString(value: unknown): value is string {
	return typeof value === 'string';
}

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
function isValidOverlayContrastCacheEntry(value: unknown): value is OverlayContrastCacheEntry {
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
function normalizeOverlayTextContrastCache(value: unknown): Record<string, OverlayContrastCacheEntry> {
	if (!isPlainObject(value)) {
		return {};
	}

	const normalized: Record<string, OverlayContrastCacheEntry> = {};
	for (const [
		path,
		entry
	] of Object.entries(value)) {
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
	for (const [
		key,
		entry
	] of Object.entries(value)) {
		// Assigning to `__proto__` would replace the prototype instead of adding a key.
		if (key === '__proto__') {
			continue;
		}
		const cluster = normalizeCluster(
			key,
			entry
		);
		if (cluster !== null) {
			read[key] = cluster;
		}
	}

	const normalized: TabCandyClusters = {};
	for (const [
		key,
		cluster
	] of Object.entries(read)) {
		const partnerId = cluster.pairedWith;
		const isReciprocal =
			partnerId !== null &&
			partnerId !== key &&
			Boolean(Object.prototype.hasOwnProperty.call(
				read,
				partnerId
			)) &&
			read[partnerId].pairedWith === key;
		normalized[key] = isReciprocal ? cluster : {
			...cluster,
			pairedWith: null
		};
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

	/** Booleans and strings: accepted when the type matches. */
	for (const key of Object.keys(BOOLEAN_FIELDS) as BooleanField[]) {
		copyField(
			normalized,
			key,
			data[key],
			isBoolean
		);
	}
	for (const key of Object.keys(STRING_FIELDS) as StringField[]) {
		copyField(
			normalized,
			key,
			data[key],
			isString
		);
	}

	/** Enum fields: accepted when the value is a member of the field's enum. */
	for (const key of Object.keys(ENUM_FIELDS) as EnumField[]) {
		const members = ENUM_FIELDS[key];
		copyField(
			normalized,
			key,
			data[key],
			(value): value is TabCandySettings[typeof key] => typeof value === 'string' && isEnumValue(
				members,
				value
			)
		);
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
	normalized.overlayTextContrastCache = normalizeOverlayTextContrastCache(data.overlayTextContrastCache);

	/** Clusters: bad entries are repaired or dropped individually. */
	normalized.clusters = normalizeClusters(data.clusters);

	normalized.settingsVersion = CURRENT_SETTINGS_VERSION;

	return normalized;
}