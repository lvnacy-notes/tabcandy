import { App, Command } from 'obsidian';
import { goToAdjacentTab } from '../tabs/tabNavigation';

/**
 * Builds the command that focuses the previous tab, wrapping past the first,
 * across all groups.
 *
 * @param app - The Obsidian app.
 * @returns The `previous-tab-across-groups` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'previous-tab-across-groups',
		name: 'Go to previous tab across groups',
		callback: () => {
			goToAdjacentTab(app, -1);
		},
	};
}