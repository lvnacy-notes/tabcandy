import type { Command } from 'obsidian';
import { closeTabsInFolder } from '../tabs/tabNavigation';
import ChooseFolderModal from '../ui/ChooseFolderModal';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that asks for a folder, then closes the tabs showing
 * files in it. Subfolders are included when `closeTabsInFolderRecursive` is on.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `close-tabs-in-folder` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const {
		app,
		settingsStore
	} = dependencies;

	return {
		id: 'close-tabs-in-folder',
		name: 'Close tabs in folder…',
		callback: () => {
			new ChooseFolderModal(app, (folder) => {
				closeTabsInFolder(
					app,
					folder.path,
					settingsStore.get().closeTabsInFolderRecursive
				);
			}).open();
		},
	};
}