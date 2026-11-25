/** @file The clear-reading-companion command. */
import type { Command } from 'obsidian';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that unsets the reading companion. Available while one is set.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `clear-reading-companion` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { readingCompanion } = dependencies;

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