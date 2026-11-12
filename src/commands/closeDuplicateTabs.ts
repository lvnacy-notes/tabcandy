import { App, Command } from 'obsidian';
import { closeDuplicateTabs } from '../tabs/tabNavigation';

/**
 * Builds the command that closes tabs showing a file that is already open
 * in another tab.
 *
 * @param app - The Obsidian app.
 * @returns The `close-duplicate-tabs` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'close-duplicate-tabs',
		name: 'Close duplicate tabs',
		callback: () => {
			closeDuplicateTabs(app);
		},
	};
}