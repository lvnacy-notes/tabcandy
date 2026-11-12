import { App, Command } from 'obsidian';
import { closeOtherTabs } from '../tabs/tabNavigation';

/**
 * Builds the command that closes every tab except the current one.
 *
 * @param app - The Obsidian app.
 * @returns The `close-other-tabs` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'close-other-tabs',
		name: 'Close all tabs except this one',
		callback: () => {
			closeOtherTabs(app);
		},
	};
}