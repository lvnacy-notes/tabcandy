import { App, Command } from 'obsidian';
import { goToAdjacentTab } from '../tabs/tabNavigation';

/**
 * Builds the command that focuses the next tab, wrapping past the last, across
 * all groups.
 *
 * @param app - The Obsidian app.
 * @returns The `next-tab-across-groups` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'next-tab-across-groups',
		name: 'Go to next tab across groups',
		callback: () => {
			goToAdjacentTab(app, 1);
		},
	};
}