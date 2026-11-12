import { App, Command } from 'obsidian';
import { activateView } from '../obsidian/newTabHijack';

/**
 * Builds the command that opens the Tab Candy view, reusing an open one.
 *
 * @param app - The Obsidian app.
 * @returns The `open-tab-candy` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'open-tab-candy',
		name: 'Open new tab',
		callback: () => {
			void activateView(app);
		},
	};
}