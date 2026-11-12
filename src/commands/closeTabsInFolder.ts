import { App, Command } from 'obsidian';
import { closeTabsInFolder } from '../tabs/tabNavigation';
import ChooseFolderModal from '../ui/ChooseFolderModal';
import SettingsStore from '../settings/SettingsStore';

/**
 * Builds the command that asks for a folder, then closes the tabs showing
 * files in it. Subfolders are included when `closeTabsInFolderRecursive` is on.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 * @returns The `close-tabs-in-folder` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore
): Command {
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