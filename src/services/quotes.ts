import {
	App,
	EventRef,
	normalizePath
} from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import { CustomQuote } from '../types';
import debounce from '../utils/debounce';

/**
 * Matches a blockquote line that is nothing but an attribution: an
 * em dash, en dash, or hyphen, followed by whitespace and the author's
 * name. Anchored to the *last* line of a block only (see
 * `parseQuoteBlockquotes` below) - a hyphen at the start of an
 * interior line is left alone as ordinary quote text, since only the
 * final line of a block is ever tested against this pattern.
 */
const ATTRIBUTION_LINE = /^[—–-]\s*(.+)$/;

/**
 * Strips a single leading `>` and, if present, exactly one space after
 * it, from a raw blockquote line. Matches how every real markdown editor
 * (including Obsidian's own) writes blockquotes - `> text`, not
 * `>text` or `>   text` - without assuming there's always a space to
 * strip, since a bare `>` line (a paragraph break inside a blockquote)
 * has nothing after it.
 */
function stripBlockquoteMarker(line: string): string {
	return line.replace(/^>\s?/, '');
}

/**
 * Splits raw markdown into contiguous blocks of blockquote lines. A
 * block is one or more consecutive lines whose trimmed content starts
 * with `>`; anything else - a blank line, an ordinary paragraph, a
 * heading - ends the current block without becoming part of any block
 * itself. Non-blockquote content anywhere in the file (notes, headings,
 * whatever else lives in the same vault note) is simply skipped, never
 * an error.
 */
function splitIntoBlockquoteBlocks(raw: string): string[][] {
	const blocks: string[][] = [];
	let current: string[] = [];

	for (const line of raw.split(/\r?\n/)) {
		if (line.trimStart().startsWith('>')) {
			current.push(line.trimStart());
		} else if (current.length > 0) {
			blocks.push(current);
			current = [];
		}
	}
	if (current.length > 0) {
		blocks.push(current);
	}

	return blocks;
}

/**
 * Converts one blockquote block into a quote, or `null` if the block
 * has no usable text once its marker/attribution lines are stripped
 * out - an attribution-only block, or a block that's entirely blank
 * `>` lines, is dropped rather than surfaced as an empty quote.
 *
 * Only the block's last *non-empty* content line is ever checked
 * against `ATTRIBUTION_LINE` - a trailing bare `>` line (a blockquote
 * paragraph break placed after the attribution) is skipped for this
 * check rather than mistaken for "no attribution present" just because
 * it happens to be the final physical line. A quote whose body happens
 * to end a line with a word starting in a hyphen is a separate,
 * accepted trade-off of this convention, not a bug.
 */
function parseBlock(block: string[]): CustomQuote | null {
	const contentLines = block
		.map(stripBlockquoteMarker)
		.map((line) => line.trim());

	// contentLines.findLastIndex() would read more naturally here, but
	// it's ES2023 and this project's tsconfig targets ES2020 - a plain
	// backwards loop instead.
	let lastNonEmptyIndex = -1;
	for (let index = contentLines.length - 1; index >= 0; index--) {
		if (contentLines[index] !== '') {
			lastNonEmptyIndex = index;
			break;
		}
	}
	if (lastNonEmptyIndex === -1) {return null;}

	const attributionMatch =
		contentLines[lastNonEmptyIndex].match(ATTRIBUTION_LINE);

	const author = attributionMatch ? attributionMatch[1].trim() : '';
	const textLines = attributionMatch
		? contentLines.slice(0, lastNonEmptyIndex)
		: contentLines.slice(0, lastNonEmptyIndex + 1);

	const text = textLines.filter((line) => line !== '').join(' ').trim();
	if (!text) {return null;}

	return { text, author };
}

/**
 * Parses a markdown document's top-level blockquotes into quotes, per
 * the format documented in the settings tab:
 *
 * ```markdown
 * > The only way to do great work is to love what you do.
 * > — Steve Jobs
 *
 * > Simplicity is the ultimate sophistication.
 * ```
 *
 * Pure and total: never throws, for any string input. A file with no
 * blockquotes at all, or an empty string, resolves to an empty array,
 * exactly like "no quotes configured" rather than an error state -
 * matching `listBackgroundFilesInFolder`'s philosophy in
 * `backgrounds.ts`. There is deliberately no "invalid syntax" failure
 * mode here: unlike a structured format (YAML, JSON), a line that
 * doesn't look like a blockquote is just not part of any block, so
 * malformed input degrades to fewer quotes, never a parse error.
 */
export function parseQuoteBlockquotes(raw: string): CustomQuote[] {
	return splitIntoBlockquoteBlocks(raw)
		.map(parseBlock)
		.filter((quote): quote is CustomQuote => quote !== null);
}

/**
 * Serializes one quote back into the blockquote form
 * parseQuoteBlockquotes reads. A multi-line `text` (the quote-editing
 * textarea in CustomQuotesModal allows embedded newlines) gets each of
 * its lines prefixed with the marker individually, rather than
 * collapsed to one line - an empty line becomes a bare `>`, which
 * parseQuoteBlockquotes already treats as an in-block paragraph break,
 * so a multi-paragraph quote round-trips correctly. An empty `author`
 * omits the attribution line entirely rather than emitting `> — `,
 * matching how a block with no attribution line parses back to
 * `author: ''`.
 */
function serializeQuoteBlock(quote: CustomQuote): string {
	const textLines = quote.text
		.split('\n')
		.map((line) => (line ? `> ${line}` : '>'));

	const lines = quote.author
		? [...textLines, `> — ${quote.author}`]
		: textLines;

	return lines.join('\n');
}

/**
 * Serializes a list of quotes into a single markdown document of
 * blockquotes, one block per quote, separated by a blank line - the
 * exact format parseQuoteBlockquotes parses back. This is the export
 * side of the custom-quotes import/export feature: the round trip
 * through this pair of functions is the whole feature, deliberately
 * with no separate format (JSON, YAML, etc.) in between.
 *
 * A quote with empty `text` (e.g. a freshly-added, not-yet-filled-in
 * row in the Custom Quotes modal) serializes to a block with no usable
 * content and is silently dropped by parseQuoteBlockquotes on
 * re-import - not this function's concern, since it only serializes
 * what it's given.
 */
export function serializeQuotesAsBlockquotes(quotes: CustomQuote[]): string {
	return quotes.map(serializeQuoteBlock).join('\n\n');
}

/**
 * Reads and parses the configured quotes file. Never throws: a missing
 * file, an unreadable path, or a path that resolves to a folder all
 * degrade to an empty array (logged via `console.error` for
 * debugging), the same "ordinary configuration state, not an
 * exceptional one" treatment `listBackgroundFilesInFolder` gives a
 * missing backgrounds folder.
 */
export async function listQuotesFromFile(
	app: App,
	filePath: string
): Promise<CustomQuote[]> {
	if (!filePath) {
		return [];
	}

	const normalizedPath = normalizePath(filePath);

	try {
		const raw = await app.vault.adapter.read(normalizedPath);
		return parseQuoteBlockquotes(raw);
	} catch (error) {
		console.error(
			`Tab Candy: could not read quotes file "${normalizedPath}"`,
			error
		);
		return [];
	}
}

/**
 * Re-reads the configured quotes file and writes the result to
 * settings.fileQuotes. Safe to call repeatedly (on load, on a vault
 * event, or from a "Sync now" button), and safe to call with no file
 * configured (resolves to an empty list rather than throwing).
 */
export async function syncQuotesFile(
	app: App,
	settingsStore: SettingsStore
): Promise<void> {
	const fileQuotes = await listQuotesFromFile(
		app,
		settingsStore.get().quotesFilePath
	);
	await settingsStore.update({ fileQuotes });
}

/**
 * Registers vault `create`/`modify`/`delete`/`rename` listeners that
 * keep `fileQuotes` current without requiring a reload or an explicit
 * "Sync now" click, scoped to the single configured `quotesFilePath`
 * rather than a whole folder (there's exactly one file to watch here,
 * unlike `backgroundsFolder`'s multi-file sync).
 *
 * `registerEvent` is passed in rather than this function registering
 * directly on `app.vault`, so the caller's own `Component.registerEvent()`
 * (auto-cleaned up on unload) is what actually owns the returned
 * `EventRef`s - mirrors `registerBackgroundVaultWatchers`.
 */
export function registerQuotesVaultWatcher(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void
): void {
	const isConfiguredQuotesFile = (path: string): boolean => {
		const { quotesFilePath } = settingsStore.get();
		return !!quotesFilePath && path === normalizePath(quotesFilePath);
	};

	// Collapses a burst of vault events (e.g. a sync client writing the
	// file, or a save-on-every-keystroke editor) into a single re-parse
	// 500ms after the last one, matching registerBackgroundVaultWatchers'
	// debounce window.
	const debouncedSync = debounce(() => {
		void syncQuotesFile(app, settingsStore);
	}, 500);

	registerEvent(
		app.vault.on('create', (file) => {
			if (isConfiguredQuotesFile(file.path)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('modify', (file) => {
			if (isConfiguredQuotesFile(file.path)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('delete', (file) => {
			if (isConfiguredQuotesFile(file.path)) {
				void settingsStore.update({ fileQuotes: [] });
			}
		})
	);

	registerEvent(
		app.vault.on('rename', (file, oldPath) => {
			// The file's content hasn't changed, only its path - update
			// quotesFilePath to follow it rather than re-parsing, same
			// content, from the new location. Mirrors how
			// registerBackgroundVaultWatchers updates a renamed
			// manualBackgroundFiles entry in place instead of re-syncing.
			if (isConfiguredQuotesFile(oldPath)) {
				void settingsStore.update({ quotesFilePath: file.path });
			}
		})
	);
}