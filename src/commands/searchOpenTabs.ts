import type { Command } from 'obsidian';
import SearchOpenTabsModal from '../ui/SearchOpenTabsModal';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that opens a fuzzy search over the open tabs.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `search-open-tabs` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'search-open-tabs',
		name: 'Search open tabs',
		callback: () => {
			new SearchOpenTabsModal(app).open();
		},
	};
}