import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import SettingsStore from '../settings/SettingsStore';
import { buildSettings, createConfiguredApp } from '../test/fakes';
import {
	listQuotesFromFile,
	parseQuoteBlockquotes,
	registerQuotesVaultWatcher,
	serializeQuotesAsBlockquotes,
	syncQuotesFile,
} from './quotes';

function buildStore(overrides: Parameters<typeof buildSettings>[0] = {}) {
	return new SettingsStore(buildSettings(overrides), async () => {});
}

describe('parseQuoteBlockquotes', () => {
	it('parses a single quote with an em dash attribution', () => {
		const raw = '> The only way to do great work is to love what you do.\n> — Steve Jobs';

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{
				text: 'The only way to do great work is to love what you do.',
				author: 'Steve Jobs',
			},
		]);
	});

	it('parses multiple quotes separated by a blank line', () => {
		const raw = [
			'> First quote.',
			'> — First Author',
			'',
			'> Second quote.',
			'> — Second Author',
		].join('\n');

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{ text: 'First quote.', author: 'First Author' },
			{ text: 'Second quote.', author: 'Second Author' },
		]);
	});

	it.each([
		['em dash', '—'],
		['en dash', '–'],
		['hyphen', '-'],
	])('supports %s as an attribution marker', (_label, dash) => {
		const raw = `> A quote.\n> ${dash} An Author`;

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([{ text: 'A quote.', author: 'An Author' }]);
	});

	it('joins a multi-line quote body into a single line before the attribution', () => {
		const raw = [
			'> Line one of the quote.',
			'> Line two of the quote.',
			'> — Author Name',
		].join('\n');

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{
				text: 'Line one of the quote. Line two of the quote.',
				author: 'Author Name',
			},
		]);
	});

	it('defaults to an empty author when no attribution line is present', () => {
		const raw = '> Just a quote with no author.';

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{ text: 'Just a quote with no author.', author: '' },
		]);
	});

	it('drops a block that is only an attribution line with no quote text', () => {
		const raw = '> — Just an author, no quote';

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([]);
	});

	it('drops a block that is entirely blank blockquote lines', () => {
		const raw = '>\n>\n>';

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([]);
	});

	it('ignores non-blockquote content interspersed in the file', () => {
		const raw = [
			'# My Quotes',
			'',
			'Some notes to myself that are not a quote.',
			'',
			'> A real quote.',
			'> — Real Author',
		].join('\n');

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([{ text: 'A real quote.', author: 'Real Author' }]);
	});

	it('parses a trailing block with no closing blank line before EOF', () => {
		const raw = '> Quote one.\n> — Author One\n\n> Quote two, no trailing newline.';

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{ text: 'Quote one.', author: 'Author One' },
			{ text: 'Quote two, no trailing newline.', author: '' },
		]);
	});

	it('treats a bare ">" line as a paragraph break within a block, not a block boundary', () => {
		const raw = ['> Paragraph one.', '>', '> Paragraph two.', '> — Author'].join(
			'\n'
		);

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{ text: 'Paragraph one. Paragraph two.', author: 'Author' },
		]);
	});

	it('attributes correctly even when a trailing bare ">" line follows the attribution', () => {
		const raw = ['> A quote.', '> — Author Name', '>'].join('\n');

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([{ text: 'A quote.', author: 'Author Name' }]);
	});

	it('strips markers and surrounding whitespace regardless of spacing after ">" (none, single, multiple)', () => {
		// Each line is trimmed after its marker is stripped (not just the
		// marker's own single space), so ">  Two spaces" and ">No space"
		// both normalize to a clean single space when joined - extra
		// interior indentation isn't meaningful in a quote's text.
		const raw = ['>No space before this.', '>  Two spaces before this.'].join(
			'\n'
		);

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([
			{
				text: 'No space before this. Two spaces before this.',
				author: '',
			},
		]);
	});

	it('returns an empty array for an empty string', () => {
		const result = parseQuoteBlockquotes('');

		expect(result).toEqual([]);
	});

	it('returns an empty array for a file with no blockquotes at all', () => {
		const raw = '# Just a heading\n\nAnd a paragraph, nothing quoted.';

		const result = parseQuoteBlockquotes(raw);

		expect(result).toEqual([]);
	});
});

describe('serializeQuotesAsBlockquotes', () => {
	it('serializes a single quote with an attribution', () => {
		const result = serializeQuotesAsBlockquotes([
			{ text: 'A quote.', author: 'An Author' },
		]);

		expect(result).toBe('> A quote.\n> — An Author');
	});

	it('omits the attribution line entirely when author is empty', () => {
		const result = serializeQuotesAsBlockquotes([
			{ text: 'A quote with no author.', author: '' },
		]);

		expect(result).toBe('> A quote with no author.');
	});

	it('separates multiple quotes with a blank line', () => {
		const result = serializeQuotesAsBlockquotes([
			{ text: 'First quote.', author: 'First Author' },
			{ text: 'Second quote.', author: 'Second Author' },
		]);

		expect(result).toBe(
			'> First quote.\n> — First Author\n\n> Second quote.\n> — Second Author'
		);
	});

	it('prefixes each line of a multi-line quote body with its own marker', () => {
		const result = serializeQuotesAsBlockquotes([
			{ text: 'Line one.\nLine two.', author: 'Author Name' },
		]);

		expect(result).toBe('> Line one.\n> Line two.\n> — Author Name');
	});

	it('renders an internal blank line in a multi-line quote as a bare ">"', () => {
		const result = serializeQuotesAsBlockquotes([
			{ text: 'Paragraph one.\n\nParagraph two.', author: '' },
		]);

		expect(result).toBe('> Paragraph one.\n>\n> Paragraph two.');
	});

	it('returns an empty string for an empty list', () => {
		const result = serializeQuotesAsBlockquotes([]);

		expect(result).toBe('');
	});

	it('round-trips a realistic quote list through parseQuoteBlockquotes', () => {
		const quotes = [
			{ text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
			{ text: 'Simplicity is the ultimate sophistication.', author: '' },
			{ text: 'Line one.\nLine two.', author: 'Multi-line Author' },
		];

		const result = parseQuoteBlockquotes(serializeQuotesAsBlockquotes(quotes));

		expect(result).toEqual([
			{ text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
			{ text: 'Simplicity is the ultimate sophistication.', author: '' },
			{ text: 'Line one. Line two.', author: 'Multi-line Author' },
		]);
	});

	it('drops a quote with empty text on re-parse, rather than round-tripping it', () => {
		// An in-progress "Add new quote" row with nothing typed in yet
		// serializes to a content-free block; parseQuoteBlockquotes
		// already (correctly) drops content-free blocks, so it's not
		// expected to survive a round trip.
		const quotes = [{ text: '', author: 'An Author' }];

		const result = parseQuoteBlockquotes(serializeQuotesAsBlockquotes(quotes));

		expect(result).toEqual([]);
	});
});

describe('listQuotesFromFile', () => {
	it('returns quotes parsed from an existing file', async () => {
		const app = createConfiguredApp({
			files: { 'Quotes/quotes.md': '> A quote.\n> — An Author' },
		});

		const result = await listQuotesFromFile(app, 'Quotes/quotes.md');

		expect(result).toEqual([{ text: 'A quote.', author: 'An Author' }]);
	});

	it('returns an empty array without touching the vault when the path is empty', async () => {
		const app = createConfiguredApp({ files: {} });
		const readSpy = vi.spyOn(app.vault.adapter, 'read');

		const result = await listQuotesFromFile(app, '');

		expect(result).toEqual([]);
		expect(readSpy).not.toHaveBeenCalled();
	});

	it('degrades to an empty array (and logs) when the file does not exist', async () => {
		const app = createConfiguredApp({ files: {} });
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await listQuotesFromFile(app, 'Quotes/missing.md');

		expect(result).toEqual([]);
		expect(consoleSpy).toHaveBeenCalledOnce();
	});

	it('normalizes the file path before reading (trailing slash, backslashes)', async () => {
		const app = createConfiguredApp({
			files: { 'Quotes/quotes.md': '> A quote.' },
		});
		const readSpy = vi.spyOn(app.vault.adapter, 'read');

		await listQuotesFromFile(app, 'Quotes\\/quotes.md');

		expect(readSpy).toHaveBeenCalledWith('Quotes/quotes.md');
	});
});

describe('syncQuotesFile', () => {
	it('reads the configured file and writes the result to settings.fileQuotes', async () => {
		const app = createConfiguredApp({
			files: { 'Quotes/quotes.md': '> A quote.\n> — An Author' },
		});
		const store = buildStore({ quotesFilePath: 'Quotes/quotes.md' });

		await syncQuotesFile(app, store);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'A quote.', author: 'An Author' },
		]);
	});

	it('resolves to an empty list without throwing when no file is configured', async () => {
		const app = createConfiguredApp({ files: {} });
		const store = buildStore({ quotesFilePath: '' });

		await expect(syncQuotesFile(app, store)).resolves.toBeUndefined();
		expect(store.get().fileQuotes).toEqual([]);
	});

	it('overwrites a previously-synced list rather than merging with it', async () => {
		const app = createConfiguredApp({
			files: { 'Quotes/quotes.md': '> New quote.' },
		});
		const store = buildStore({
			quotesFilePath: 'Quotes/quotes.md',
			fileQuotes: [{ text: 'Stale quote.', author: 'Stale Author' }],
		});

		await syncQuotesFile(app, store);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'New quote.', author: '' },
		]);
	});
});

describe('registerQuotesVaultWatcher', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function setUp(overrides: Parameters<typeof buildSettings>[0] = {}) {
		const app = createConfiguredApp({
			files: { 'Quotes/quotes.md': '> Existing quote.\n> — Existing Author' },
		});
		const store = buildStore({ quotesFilePath: 'Quotes/quotes.md', ...overrides });
		const registerEvent = vi.fn();
		registerQuotesVaultWatcher(app, store, registerEvent);
		return { app, store, registerEvent };
	}

	it('registers exactly one listener each for create, modify, delete, and rename', () => {
		const { registerEvent } = setUp();

		expect(registerEvent).toHaveBeenCalledTimes(4);
	});

	it('re-syncs the quotes file 500ms after it is modified', async () => {
		const { app, store } = setUp();

		await app.vault.adapter.write('Quotes/quotes.md', '> Updated quote.');
		const file = app.vault.getAbstractFileByPath('Quotes/quotes.md');
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- seeded above, guaranteed present
		app.vault.trigger('modify', file!);
		expect(store.get().fileQuotes).not.toEqual([
			{ text: 'Updated quote.', author: '' },
		]);

		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Updated quote.', author: '' },
		]);
	});

	it('does not re-sync when a different file is modified', async () => {
		const { app, store } = setUp();
		await app.vault.create('Quotes/other.md', '> Some other quote.');
		const file = app.vault.getAbstractFileByPath('Quotes/other.md');

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- created above, guaranteed present
		app.vault.trigger('modify', file!);
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([]);
	});

	it('collapses a burst of modify events into a single debounced sync', async () => {
		const { app, store } = setUp();

		for (let i = 0; i < 3; i++) {
			await app.vault.adapter.write('Quotes/quotes.md', `> Version ${i}.`);
			const file = app.vault.getAbstractFileByPath('Quotes/quotes.md');
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- seeded above, guaranteed present
			app.vault.trigger('modify', file!);
			vi.advanceTimersByTime(200);
		}
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Version 2.', author: '' },
		]);
	});

	it('re-syncs when the configured file is created (configured before the file existed)', async () => {
		const app = createConfiguredApp({ files: {} });
		const store = buildStore({ quotesFilePath: 'Quotes/quotes.md' });
		const registerEvent = vi.fn();
		registerQuotesVaultWatcher(app, store, registerEvent);

		await app.vault.create('Quotes/quotes.md', '> Brand new quote.');
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Brand new quote.', author: '' },
		]);
	});

	it('clears fileQuotes immediately (no debounce) when the configured file is deleted', async () => {
		const { app, store } = setUp({
			fileQuotes: [{ text: 'Existing quote.', author: 'Existing Author' }],
		});
		const file = app.vault.getAbstractFileByPath('Quotes/quotes.md');

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- seeded above, guaranteed present. Vault.delete() (not FileManager.trashFile()) is deliberate: it's what fires the 'delete' event this test exercises, not a stand-in for a user-facing delete action.
		await app.fileManager.trashFile(file!);

		expect(store.get().fileQuotes).toEqual([]);
	});

	it('leaves fileQuotes untouched when a different file is deleted', async () => {
		const { app, store } = setUp({
			fileQuotes: [{ text: 'Existing quote.', author: 'Existing Author' }],
		});
		await app.vault.create('Quotes/other.md', '> Some other quote.');
		const file = app.vault.getAbstractFileByPath('Quotes/other.md');

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- created above, guaranteed present
		await app.fileManager.trashFile(file!);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Existing quote.', author: 'Existing Author' },
		]);
	});

	it('updates quotesFilePath to the new path on rename, without discarding the already-synced quotes', async () => {
		const { app, store } = setUp({
			fileQuotes: [{ text: 'Existing quote.', author: 'Existing Author' }],
		});
		const file = app.vault.getAbstractFileByPath('Quotes/quotes.md');

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- seeded above, guaranteed present
		await app.vault.rename(file!, 'Quotes/renamed.md');

		expect(store.get().quotesFilePath).toBe('Quotes/renamed.md');
		expect(store.get().fileQuotes).toEqual([
			{ text: 'Existing quote.', author: 'Existing Author' },
		]);
	});

	it('does not react to a rename of an unrelated file', async () => {
		const { app, store } = setUp();
		await app.vault.create('Quotes/other.md', '> Some other quote.');
		const file = app.vault.getAbstractFileByPath('Quotes/other.md');

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- created above, guaranteed present
		await app.vault.rename(file!, 'Quotes/renamed-other.md');

		expect(store.get().quotesFilePath).toBe('Quotes/quotes.md');
	});
});