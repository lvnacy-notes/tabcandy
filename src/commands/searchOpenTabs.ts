import { App, Command } from 'obsidian';
import SearchOpenTabsModal from '../ui/SearchOpenTabsModal';

/**
 * Builds the command that opens a fuzzy search over the open tabs.
 *
 * @param app - The Obsidian app.
 * @returns The `search-open-tabs` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'search-open-tabs',
		name: 'Search open tabs',
		callback: () => {
			new SearchOpenTabsModal(app).open();
		},
	};
}