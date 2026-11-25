import type { Command } from 'obsidian';
import { reopenLastClosedTab } from '../tabs/tabNavigation';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that reopens the most recently closed tab.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `reopen-closed-tab` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'reopen-closed-tab',
		name: 'Reopen closed tab',
		callback: () => {
			reopenLastClosedTab(app);
		},
	};
}