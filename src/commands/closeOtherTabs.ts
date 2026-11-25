import type { Command } from 'obsidian';
import { closeOtherTabs } from '../tabs/tabNavigation';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that closes every tab except the current one.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `close-other-tabs` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'close-other-tabs',
		name: 'Close all tabs except this one',
		callback: () => {
			closeOtherTabs(app);
		},
	};
}