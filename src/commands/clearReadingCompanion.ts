/** @file The clear-reading-companion command. */
import { Command } from 'obsidian';
import ReadingCompanion from '../obsidian/ReadingCompanion';

/**
 * Builds the command that unsets the reading companion. Available while one is set.
 *
 * @param readingCompanion - The reading companion.
 * @returns The `clear-reading-companion` command.
 */
export function buildInvokeCommand(readingCompanion: ReadingCompanion): Command {
	return {
		id: 'clear-reading-companion',
		name: 'Clear reading companion',
		checkCallback: (checking) => {
			if (!readingCompanion.isSet()) {
				return false;
			}
			if (!checking) {
				readingCompanion.clear();
			}
			return true;
		},
	};
}