import { App, Command } from 'obsidian';
import { reopenLastClosedTab } from '../tabs/tabNavigation';

/**
 * Builds the command that reopens the most recently closed tab.
 *
 * @param app - The Obsidian app.
 * @returns The `reopen-closed-tab` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'reopen-closed-tab',
		name: 'Reopen closed tab',
		callback: () => {
			reopenLastClosedTab(app);
		},
	};
}