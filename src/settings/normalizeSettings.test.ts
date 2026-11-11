/**
 * @file Tests for `normalizeSettings`: defaults for missing or malformed
 * data, per-type validation of every field, and version stamping.
 */
import {
	describe,
	expect,
	it
} from 'vitest';
import { DEFAULT_SETTINGS } from './defaultSettings';
import { CURRENT_SETTINGS_VERSION, normalizeSettings } from './normalizeSettings';
import {
	BOOKMARK_SOURCE,
	BackgroundTheme,
	TIME_FORMAT,
	UNTITLED_CLUSTER_NAME,
} from '../types';

describe('normalizeSettings', () => {
	it('returns DEFAULT_SETTINGS with the current version stamped when given no data at all', () => {
		const raw = undefined;

		const result = normalizeSettings(raw);

		expect(result).toEqual({
			...DEFAULT_SETTINGS,
			settingsVersion: CURRENT_SETTINGS_VERSION,
		});
	});

	it('falls back to defaults when given null instead of an object', () => {
		const raw = null;

		const result = normalizeSettings(raw);

		expect(result).toEqual({
			...DEFAULT_SETTINGS,
			settingsVersion: CURRENT_SETTINGS_VERSION,
		});
	});

	it('falls back to defaults when given a non-object primitive', () => {
		const raw = 'not an object';

		const result = normalizeSettings(raw);

		expect(result).toEqual({
			...DEFAULT_SETTINGS,
			settingsVersion: CURRENT_SETTINGS_VERSION,
		});
	});

	it('falls back to defaults when given an array instead of a plain object', () => {
		const raw = ['not', 'a', 'settings', 'object'];

		const result = normalizeSettings(raw);

		expect(result).toEqual({
			...DEFAULT_SETTINGS,
			settingsVersion: CURRENT_SETTINGS_VERSION,
		});
	});

	it('always stamps the current settings version regardless of what was loaded', () => {
		const raw = { settingsVersion: 999 };

		const result = normalizeSettings(raw);

		expect(result.settingsVersion).toBe(CURRENT_SETTINGS_VERSION);
	});

	describe('boolean fields', () => {
		const booleanFields = [
			'replaceEmptyTabsWithTabCandy',
			'showTopLeftSearchButton',
			'showTime',
			'showGreeting',
			'showInlineSearch',
			'showRecentFiles',
			'showBookmarks',
			'showQuote',
			'autoContrastOverlayText',
			'closeTabsInFolderRecursive',
			'showRecentlyClosedTabs',
			'widenStackedTabPanes',
			'dashboardFocusesOpenTab',
			'keepPairedClustersInSync',
			'jumpToExistingCluster',
		] as const;

		it.each(booleanFields)('passes through a valid boolean for %s', (field) => {
			const raw = { [field]: !DEFAULT_SETTINGS[field] };

			const result = normalizeSettings(raw);

			expect(result[field]).toBe(!DEFAULT_SETTINGS[field]);
		});

		it.each(booleanFields)('falls back to the default for %s when given a non-boolean', (field) => {
			const raw = { [field]: 'not a boolean' };

			const result = normalizeSettings(raw);

			expect(result[field]).toBe(DEFAULT_SETTINGS[field]);
		});

		it.each(booleanFields)('falls back to the default for %s when the field is missing', (field) => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result[field]).toBe(DEFAULT_SETTINGS[field]);
		});
	});

	describe('plain string fields', () => {
		const stringFields = [
			'customBackground',
			'backgroundsFolder',
			'greetingText',
			'bookmarkGroup',
			'quotesFilePath',
		] as const;

		it.each(stringFields)('passes through a valid string for %s', (field) => {
			const raw = { [field]: 'a custom value' };

			const result = normalizeSettings(raw);

			expect(result[field]).toBe('a custom value');
		});

		it.each(stringFields)('falls back to the default for %s when given a non-string', (field) => {
			const raw = { [field]: 12345 };

			const result = normalizeSettings(raw);

			expect(result[field]).toBe(DEFAULT_SETTINGS[field]);
		});

		it.each(stringFields)('falls back to the default for %s when the field is missing', (field) => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result[field]).toBe(DEFAULT_SETTINGS[field]);
		});
	});

	describe('backgroundTheme enum', () => {
		it('passes through a valid enum value', () => {
			const raw = { backgroundTheme: BackgroundTheme.TRANSPARENT };

			const result = normalizeSettings(raw);

			expect(result.backgroundTheme).toBe(BackgroundTheme.TRANSPARENT);
		});

		it('falls back to the default when given a value from a since-renamed enum member', () => {
			const raw = { backgroundTheme: 'a legacy value that no longer exists' };

			const result = normalizeSettings(raw);

			expect(result.backgroundTheme).toBe(DEFAULT_SETTINGS.backgroundTheme);
		});

		it('falls back to the default when given a non-string', () => {
			const raw = { backgroundTheme: 42 };

			const result = normalizeSettings(raw);

			expect(result.backgroundTheme).toBe(DEFAULT_SETTINGS.backgroundTheme);
		});

		it('falls back to the default when the field is missing', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.backgroundTheme).toBe(DEFAULT_SETTINGS.backgroundTheme);
		});
	});

	describe('timeFormat enum', () => {
		it('passes through a valid enum value', () => {
			const raw = { timeFormat: TIME_FORMAT.TWENTY_FOUR_HOUR };

			const result = normalizeSettings(raw);

			expect(result.timeFormat).toBe(TIME_FORMAT.TWENTY_FOUR_HOUR);
		});

		it('falls back to the default when given an invalid value', () => {
			const raw = { timeFormat: 'thirteen-hour' };

			const result = normalizeSettings(raw);

			expect(result.timeFormat).toBe(DEFAULT_SETTINGS.timeFormat);
		});

		it('falls back to the default when the field is missing', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.timeFormat).toBe(DEFAULT_SETTINGS.timeFormat);
		});
	});

	describe('bookmarkSource enum', () => {
		it('passes through a valid enum value', () => {
			const raw = { bookmarkSource: BOOKMARK_SOURCE.GROUP };

			const result = normalizeSettings(raw);

			expect(result.bookmarkSource).toBe(BOOKMARK_SOURCE.GROUP);
		});

		it('falls back to the default when given an invalid value', () => {
			const raw = { bookmarkSource: 'nonexistent-source' };

			const result = normalizeSettings(raw);

			expect(result.bookmarkSource).toBe(DEFAULT_SETTINGS.bookmarkSource);
		});

		it('falls back to the default when the field is missing', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.bookmarkSource).toBe(DEFAULT_SETTINGS.bookmarkSource);
		});
	});

	describe('backgroundFiles / manualBackgroundFiles string arrays', () => {
		const arrayFields = ['backgroundFiles', 'manualBackgroundFiles'] as const;

		it.each(arrayFields)('passes through a valid string array for %s', (field) => {
			const raw = { [field]: ['Assets/one.png', 'Assets/two.jpg'] };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(['Assets/one.png', 'Assets/two.jpg']);
		});

		it.each(arrayFields)('passes through an empty array for %s', (field) => {
			const raw = { [field]: [] };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual([]);
		});

		it.each(arrayFields)('drops the whole array for %s when any entry is not a string', (field) => {
			const raw = { [field]: ['Assets/one.png', 42, 'Assets/two.jpg'] };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});

		it.each(arrayFields)('falls back to the default for %s when given a non-array', (field) => {
			const raw = { [field]: 'not an array' };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});

		it.each(arrayFields)('falls back to the default for %s when the field is missing', (field) => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});
	});

	describe('customQuotes', () => {
		it('passes through a valid array of custom quotes', () => {
			const raw = {
				customQuotes: [
					{ text: 'Be excellent to each other.', author: 'Bill' },
					{ text: 'Party on, dudes.', author: 'Ted' },
				],
			};

			const result = normalizeSettings(raw);

			expect(result.customQuotes).toEqual(raw.customQuotes);
		});

		it('passes through an empty array', () => {
			const raw = { customQuotes: [] };

			const result = normalizeSettings(raw);

			expect(result.customQuotes).toEqual([]);
		});

		it('drops the whole array when one entry is missing its author field', () => {
			const raw = {
				customQuotes: [
					{ text: 'Be excellent to each other.', author: 'Bill' },
					{ text: 'Missing an author' },
				],
			};

			const result = normalizeSettings(raw);

			expect(result.customQuotes).toEqual(DEFAULT_SETTINGS.customQuotes);
		});

		it('drops the whole array when one entry has a non-string text field', () => {
			const raw = {
				customQuotes: [{ text: 123, author: 'Bill' }],
			};

			const result = normalizeSettings(raw);

			expect(result.customQuotes).toEqual(DEFAULT_SETTINGS.customQuotes);
		});

		it('falls back to the default when given a non-array', () => {
			const raw = { customQuotes: 'not an array' };

			const result = normalizeSettings(raw);

			expect(result.customQuotes).toEqual(DEFAULT_SETTINGS.customQuotes);
		});

		it('falls back to the default when the field is missing', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.customQuotes).toEqual(DEFAULT_SETTINGS.customQuotes);
		});
	});

	describe('fileQuotes', () => {
		it('passes through a valid array of quotes parsed from the quotes file', () => {
			const raw = {
				fileQuotes: [
					{ text: 'Be excellent to each other.', author: 'Bill' },
					{ text: 'Party on, dudes.', author: 'Ted' },
				],
			};

			const result = normalizeSettings(raw);

			expect(result.fileQuotes).toEqual(raw.fileQuotes);
		});

		it('passes through an empty array', () => {
			const raw = { fileQuotes: [] };

			const result = normalizeSettings(raw);

			expect(result.fileQuotes).toEqual([]);
		});

		it('drops the whole array when one entry is missing its author field', () => {
			const raw = {
				fileQuotes: [
					{ text: 'Be excellent to each other.', author: 'Bill' },
					{ text: 'Missing an author' },
				],
			};

			const result = normalizeSettings(raw);

			expect(result.fileQuotes).toEqual(DEFAULT_SETTINGS.fileQuotes);
		});

		it('drops the whole array when one entry has a non-string text field', () => {
			const raw = {
				fileQuotes: [{ text: 123, author: 'Bill' }],
			};

			const result = normalizeSettings(raw);

			expect(result.fileQuotes).toEqual(DEFAULT_SETTINGS.fileQuotes);
		});

		it('falls back to the default when given a non-array', () => {
			const raw = { fileQuotes: 'not an array' };

			const result = normalizeSettings(raw);

			expect(result.fileQuotes).toEqual(DEFAULT_SETTINGS.fileQuotes);
		});

		it('falls back to the default when the field is missing', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.fileQuotes).toEqual(DEFAULT_SETTINGS.fileQuotes);
		});
	});

	describe('overlayTextContrastCache', () => {
		it('passes through a valid cache object unchanged', () => {
			const raw = {
				overlayTextContrastCache: {
					'Backgrounds/sunset.png': {
						mtime: 123,
						dominantColor: '#ff8800',
						overlayTextColor: '#1a1a1a',
					},
				},
			};

			const result = normalizeSettings(raw);

			expect(result.overlayTextContrastCache).toEqual(raw.overlayTextContrastCache);
		});

		it('falls back to an empty object when the field is missing', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.overlayTextContrastCache).toEqual({});
		});

		it('falls back to an empty object when given a non-object', () => {
			const raw = { overlayTextContrastCache: 'not an object' };

			const result = normalizeSettings(raw);

			expect(result.overlayTextContrastCache).toEqual({});
		});

		it('falls back to an empty object when given an array', () => {
			const raw = { overlayTextContrastCache: ['not', 'a', 'cache'] };

			const result = normalizeSettings(raw);

			expect(result.overlayTextContrastCache).toEqual({});
		});

		it('drops only the entry with a non-numeric mtime, keeping the rest', () => {
			const raw = {
				overlayTextContrastCache: {
					'Backgrounds/keep.png': {
						mtime: 123,
						dominantColor: '#ff8800',
						overlayTextColor: '#1a1a1a',
					},
					'Backgrounds/bad-mtime.png': {
						mtime: 'not a number',
						dominantColor: '#ff8800',
						overlayTextColor: '#1a1a1a',
					},
				},
			};

			const result = normalizeSettings(raw);

			expect(result.overlayTextContrastCache).toEqual({
				'Backgrounds/keep.png': raw.overlayTextContrastCache['Backgrounds/keep.png'],
			});
		});

		it('drops only the entry missing overlayTextColor, keeping the rest', () => {
			const raw = {
				overlayTextContrastCache: {
					'Backgrounds/keep.png': {
						mtime: 123,
						dominantColor: '#ff8800',
						overlayTextColor: '#1a1a1a',
					},
					'Backgrounds/incomplete.png': {
						mtime: 456,
						dominantColor: '#ff8800',
					},
				},
			};

			const result = normalizeSettings(raw);

			expect(result.overlayTextContrastCache).toEqual({
				'Backgrounds/keep.png': raw.overlayTextContrastCache['Backgrounds/keep.png'],
			});
		});
	});

	describe('search providers', () => {
		const providerFields = ['topLeftSearchProvider', 'inlineSearchProvider'] as const;

		it.each(providerFields)('passes through a valid provider for %s', (field) => {
			const raw = {
				[field]: { command: 'omnisearch:open', display: 'Omnisearch' },
			};

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(raw[field]);
		});

		it.each(providerFields)('falls back wholesale for %s when command is missing', (field) => {
			const raw = { [field]: { display: 'Missing a command' } };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});

		it.each(providerFields)('falls back wholesale for %s when display is missing', (field) => {
			const raw = { [field]: { command: 'missing:display' } };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});

		it.each(providerFields)('falls back wholesale for %s when given a non-object', (field) => {
			const raw = { [field]: 'not a provider object' };

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});

		it.each(providerFields)('falls back to the default for %s when the field is missing', (field) => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result[field]).toEqual(DEFAULT_SETTINGS[field]);
		});
	});

	describe('clusters', () => {
		/** A fully populated, valid stored Cluster. */
		function storedCluster(overrides: Record<string, unknown> = {}) {
			return {
				id: 'a',
				name: 'Research',
				members: ['one.md', 'two.md'],
				flavor: '#ff8800',
				layoutSnapshot: { main: { type: 'split', children: [] } },
				lastTouchedAt: 1700000000000,
				pairedWith: null,
				...overrides,
			};
		}

		it('defaults to an empty record on a fresh install', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.clusters).toEqual({});
		});

		it('does not hand out the shared default record', () => {
			const raw = {};

			const result = normalizeSettings(raw);

			expect(result.clusters).not.toBe(DEFAULT_SETTINGS.clusters);
		});

		it('loads settings saved before Clusters existed with no Clusters and everything else intact', () => {
			const raw = { settingsVersion: 1, showTime: false, greetingText: 'Hi' };

			const result = normalizeSettings(raw);

			expect(result.clusters).toEqual({});
			expect(result.showTime).toBe(false);
			expect(result.greetingText).toBe('Hi');
			expect(result.settingsVersion).toBe(CURRENT_SETTINGS_VERSION);
		});

		it('passes a valid Cluster through unchanged, including after a JSON round trip', () => {
			const stored = storedCluster();
			const raw: unknown = JSON.parse(JSON.stringify({ clusters: { a: stored } }));

			const result = normalizeSettings(raw);

			expect(result.clusters.a).toEqual(stored);
		});

		it.each([
			['a string', 'not an object'],
			['a number', 5],
			['null', null],
			['an array', [storedCluster()]],
		])('falls back to an empty record when clusters is %s', (_kind, value) => {
			const raw = { clusters: value };

			const result = normalizeSettings(raw);

			expect(result.clusters).toEqual({});
		});

		it.each([
			['a string', 'oops'],
			['null', null],
			['an array', ['oops']],
		])('drops a stored Cluster that is %s without touching the others', (_kind, value) => {
			const raw = { clusters: { bad: value, a: storedCluster() } };

			const result = normalizeSettings(raw);

			expect(Object.keys(result.clusters)).toEqual(['a']);
		});

		it('takes the id from the storage key when the stored id disagrees', () => {
			const raw = { clusters: { real: storedCluster({ id: 'something-else' }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.real.id).toBe('real');
		});

		it('takes the id from the storage key when the stored id is missing', () => {
			const { id: _id, ...withoutId } = storedCluster();
			const raw = { clusters: { real: withoutId } };

			const result = normalizeSettings(raw);

			expect(result.clusters.real.id).toBe('real');
		});

		it('ignores a __proto__ key instead of letting it replace the record prototype', () => {
			const raw: unknown = JSON.parse(
				'{"clusters": {"__proto__": {"name": "sneaky"}, "a": {"name": "fine"}}}'
			);

			const result = normalizeSettings(raw);

			expect(Object.keys(result.clusters)).toEqual(['a']);
			expect(Object.getPrototypeOf(result.clusters)).toBe(Object.prototype);
		});

		it('falls back to the untitled name when name is not a string', () => {
			const raw = { clusters: { a: storedCluster({ name: 42 }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.name).toBe(UNTITLED_CLUSTER_NAME);
		});

		it('keeps an empty-string name as it is', () => {
			const raw = { clusters: { a: storedCluster({ name: '' }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.name).toBe('');
		});

		it('drops non-string members one at a time and keeps the rest in order', () => {
			const raw = {
				clusters: { a: storedCluster({ members: ['one.md', 7, null, 'two.md', {}] }) },
			};

			const result = normalizeSettings(raw);

			expect(result.clusters.a.members).toEqual(['one.md', 'two.md']);
		});

		it('falls back to no members when members is not an array', () => {
			const raw = { clusters: { a: storedCluster({ members: 'one.md' }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.members).toEqual([]);
		});

		it.each([
			'#abc',
			'#aabbcc',
			'#AABBCC',
			'#aabbccdd',
		])('keeps the valid hex Flavor %s', (flavor) => {
			const raw = { clusters: { a: storedCluster({ flavor }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.flavor).toBe(flavor);
		});

		it.each([
			['a color name', 'red'],
			['a hex without the hash', 'ff8800'],
			['a hex of the wrong length', '#ff88'],
			['non-hex digits', '#gggggg'],
			['CSS that would escape the property', '#fff; background: url(x)'],
			['a number', 0xff8800],
		])('drops a Flavor that is %s, leaving it unset', (_kind, flavor) => {
			const raw = { clusters: { a: storedCluster({ flavor }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a).not.toHaveProperty('flavor');
		});

		it('leaves Flavor unset when it was never stored', () => {
			const { flavor: _flavor, ...withoutFlavor } = storedCluster();
			const raw = { clusters: { a: withoutFlavor } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a).not.toHaveProperty('flavor');
		});

		it.each([
			['a string', 'main'],
			['an array', [1, 2]],
			['null', null],
		])('drops a layoutSnapshot that is %s, leaving it unset', (_kind, layoutSnapshot) => {
			const raw = { clusters: { a: storedCluster({ layoutSnapshot }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a).not.toHaveProperty('layoutSnapshot');
		});

		it.each([
			['a string', '1700000000000'],
			['NaN', Number.NaN],
			['Infinity', Number.POSITIVE_INFINITY],
			['null', null],
		])('falls back to 0 when lastTouchedAt is %s', (_kind, lastTouchedAt) => {
			const raw = { clusters: { a: storedCluster({ lastTouchedAt }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.lastTouchedAt).toBe(0);
		});

		it('falls back to unpaired when pairedWith is not a string', () => {
			const raw = { clusters: { a: storedCluster({ pairedWith: 7 }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBeNull();
		});

		it('keeps a Pairing when both Clusters point at each other', () => {
			const raw = {
				clusters: {
					a: storedCluster({ id: 'a', pairedWith: 'b' }),
					b: storedCluster({ id: 'b', pairedWith: 'a' }),
				},
			};

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBe('b');
			expect(result.clusters.b.pairedWith).toBe('a');
		});

		it('unpairs a Cluster whose partner does not exist', () => {
			const raw = { clusters: { a: storedCluster({ pairedWith: 'gone' }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBeNull();
		});

		it('unpairs a Cluster paired with itself', () => {
			const raw = { clusters: { a: storedCluster({ pairedWith: 'a' }) } };

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBeNull();
		});

		it('unpairs a one-sided Pairing, where the partner does not point back', () => {
			const raw = {
				clusters: {
					a: storedCluster({ id: 'a', pairedWith: 'b' }),
					b: storedCluster({ id: 'b', pairedWith: null }),
				},
			};

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBeNull();
			expect(result.clusters.b.pairedWith).toBeNull();
		});

		it('keeps only the reciprocal Pairing when a third Cluster points into it', () => {
			const raw = {
				clusters: {
					a: storedCluster({ id: 'a', pairedWith: 'b' }),
					b: storedCluster({ id: 'b', pairedWith: 'c' }),
					c: storedCluster({ id: 'c', pairedWith: 'b' }),
				},
			};

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBeNull();
			expect(result.clusters.b.pairedWith).toBe('c');
			expect(result.clusters.c.pairedWith).toBe('b');
		});

		it('unpairs a Cluster whose partner was dropped for not being an object', () => {
			const raw = {
				clusters: {
					a: storedCluster({ id: 'a', pairedWith: 'b' }),
					b: 'corrupt',
				},
			};

			const result = normalizeSettings(raw);

			expect(result.clusters.a.pairedWith).toBeNull();
		});
	});

	it('drops an unknown legacy field entirely rather than carrying it forward', () => {
		const raw = {
			showTime: true,
			aFieldThatNoLongerExists: 'leftover from an old version',
		};

		const result = normalizeSettings(raw);

		expect(result).not.toHaveProperty('aFieldThatNoLongerExists');
	});

	it('normalizes a fully malformed legacy settings object field-by-field rather than rejecting it wholesale', () => {
		const raw = {
			replaceEmptyTabsWithTabCandy: 'yes please',
			backgroundTheme: 'a theme that got renamed away',
			backgroundFiles: ['fine.png', 7, 'also-fine.jpg'],
			customQuotes: 'not even an array',
			topLeftSearchProvider: { command: 'switcher:open' },
			showQuote: false,
			quoteSource: 'Quoteable',
			aRemovedField: 'from three versions ago',
		};

		const result = normalizeSettings(raw);

		expect(result).toEqual({
			...DEFAULT_SETTINGS,
			showQuote: false,
			settingsVersion: CURRENT_SETTINGS_VERSION,
		});
	});
});