import type { Command } from 'obsidian';
import { goToAdjacentTab } from '../tabs/tabNavigation';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that focuses the next tab, wrapping past the last, across
 * all groups.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `next-tab-across-groups` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'next-tab-across-groups',
		name: 'Go to next tab across groups',
		callback: () => {
			goToAdjacentTab(
				app,
				1
			);
		},
	};
}