import {
	App,
	normalizePath
} from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import { CustomQuote } from '../types';

/** Matches an attribution line: a dash (em, en or hyphen), whitespace, then the author, which is capture group 1. */
const ATTRIBUTION_LINE = /^[—–-]\s*(.+)$/;

/**
 * Removes a leading `>` and one optional space after it.
 *
 * @param line - A raw blockquote line.
 * @returns The line without its marker.
 */
function stripBlockquoteMarker(line: string): string {
	return line.replace(/^>\s?/, '');
}

/**
 * Groups consecutive blockquote lines into blocks. Any other line ends the
 * current block and is skipped.
 *
 * @param raw - Markdown text.
 * @returns The blocks, each a list of left-trimmed lines.
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
 * Parses one blockquote block into a quote. A last non-empty line matching
 * `ATTRIBUTION_LINE` is the author; the remaining non-empty lines, joined by
 * spaces, are the text.
 *
 * @param block - Lines of one blockquote block.
 * @returns The quote, or null when the block has no text.
 */
function parseBlock(block: string[]): CustomQuote | null {
	const contentLines = block
		.map(stripBlockquoteMarker)
		.map((line) => line.trim());

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
 * Parses a markdown document's blockquotes into quotes:
 *
 * ```markdown
 * > The only way to do great work is to love what you do.
 * > — Steve Jobs
 *
 * > Simplicity is the ultimate sophistication.
 * ```
 *
 * Never throws. Text outside blockquotes is ignored, so input with no
 * blockquotes returns an empty array.
 *
 * @param raw - Markdown text.
 * @returns The quotes, in document order.
 */
export function parseQuoteBlockquotes(raw: string): CustomQuote[] {
	return splitIntoBlockquoteBlocks(raw)
		.map(parseBlock)
		.filter((quote): quote is CustomQuote => quote !== null);
}

/**
 * Serializes one quote as a blockquote. Each line of `text` gets a `>`
 * prefix, with empty lines as a bare `>`. A non-empty author is added as a
 * final `> — author` line.
 *
 * @param quote - The quote.
 * @returns The blockquote text.
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
 * Serializes quotes as blockquotes separated by blank lines. The inverse of
 * `parseQuoteBlockquotes`.
 *
 * @param quotes - The quotes.
 * @returns The markdown text.
 */
export function serializeQuotesAsBlockquotes(quotes: CustomQuote[]): string {
	return quotes.map(serializeQuoteBlock).join('\n\n');
}

/**
 * Reads and parses a quotes file. Logs and returns an empty array when the
 * path is empty or the file can't be read.
 *
 * @param app - The Obsidian app.
 * @param filePath - Vault-relative file path.
 * @returns The quotes in the file.
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
 * Writes the quotes parsed from the configured quotes file to `fileQuotes`.
 * Writes an empty list when no file is set.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
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