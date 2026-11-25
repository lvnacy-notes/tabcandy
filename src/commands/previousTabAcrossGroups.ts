import type { Command } from 'obsidian';
import { goToAdjacentTab } from '../tabs/tabNavigation';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that focuses the previous tab, wrapping past the first,
 * across all groups.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `previous-tab-across-groups` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'previous-tab-across-groups',
		name: 'Go to previous tab across groups',
		callback: () => {
			goToAdjacentTab(
				app,
				-1
			);
		},
	};
}