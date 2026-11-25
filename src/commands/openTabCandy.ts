import type { Command } from 'obsidian';
import { activateView } from '../obsidian/newTabHijack';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that opens the Tab Candy view, reusing an open one.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `open-tab-candy` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'open-tab-candy',
		name: 'Open new tab',
		callback: () => {
			void activateView(app);
		},
	};
}