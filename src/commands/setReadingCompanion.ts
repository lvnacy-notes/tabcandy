/** @file The set-reading-companion command. */
import {
	App,
	Command
} from 'obsidian';
import ReadingCompanion from '../obsidian/ReadingCompanion';
import type { PromptForClusterChoice } from '../types';

/**
 * Builds the command that makes the active tab the reading companion of a Cluster. Available when the active tab is a file-backed root tab and a Cluster exists.
 *
 * @param app - The Obsidian app.
 * @param readingCompanion - The reading companion.
 * @param prompt - Collects the choice of Cluster.
 * @returns The `set-reading-companion` command.
 */
export function buildInvokeCommand(
	app: App,
	readingCompanion: ReadingCompanion,
	prompt: PromptForClusterChoice
): Command {
	return {
		id: 'set-reading-companion',
		name: 'Set reading companion',
		checkCallback: (checking) => {
			const leaf = app.workspace.getMostRecentLeaf();
			if (!readingCompanion.canSet(leaf)) {
				return false;
			}
			if (!checking) {
				readingCompanion.promptAndSet(
					prompt,
					leaf
				);
			}
			return true;
		},
	};
}