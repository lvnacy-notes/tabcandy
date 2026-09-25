import { App, Command } from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import ChooseFolderModal from '../ui/modals/ChooseFolderModal';
import { activateView } from './newTabHijack';
import SearchOpenTabsModal from '../ui/modals/SearchOpenTabsModal';
import {
	closeDuplicateTabs,
	closeOtherTabs,
	closeTabsInFolder,
	reopenLastClosedTab,
} from './tabNavigation';

export function registerTabCommands(
	app: App,
	settingsStore: SettingsStore,
	addCommand: (command: Command) => Command
): void {
	addCommand({
		id: 'close-duplicate-tabs',
		name: 'Close duplicate tabs',
		callback: () => {
			closeDuplicateTabs(app);
		},
	});

	addCommand({
		id: 'close-other-tabs',
		name: 'Close all tabs except this one',
		callback: () => {
			closeOtherTabs(app);
		},
	});

	addCommand({
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
	});

	addCommand({
		id: 'open-tab-candy',
		name: 'Open new tab',
		callback: () => {
			void activateView(app);
		},
	});

	addCommand({
		id: 'reopen-closed-tab',
		name: 'Reopen closed tab',
		callback: () => {
			reopenLastClosedTab(app);
		},
	});

	addCommand({
		id: 'search-open-tabs',
		name: 'Search open tabs',
		callback: () => {
			new SearchOpenTabsModal(app).open();
		},
	});
}