import type { Command } from 'obsidian';
import { closeDuplicateTabs } from '../tabs/tabNavigation';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that closes tabs showing a file that is already open
 * in another tab.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `close-duplicate-tabs` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'close-duplicate-tabs',
		name: 'Close duplicate tabs',
		callback: () => {
			closeDuplicateTabs(app);
		},
	};
}