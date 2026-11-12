import type { EventRef } from 'obsidian';
import { buildInvokeCommand as buildCloseDuplicateTabsCommand } from './commands/closeDuplicateTabs';
import { buildInvokeCommand as buildCloseOtherTabsCommand } from './commands/closeOtherTabs';
import { buildInvokeCommand as buildCloseTabsInFolderCommand } from './commands/closeTabsInFolder';
import { buildInvokeCommand as buildCreateClusterCommand } from './commands/createCluster';
import { buildInvokeCommand as buildCreateClusterFromActivePaneCommand } from './commands/createClusterFromActivePane';
import { buildInvokeCommand as buildCreateClusterFromActiveTabCommand } from './commands/createClusterFromActiveTab';
import { buildInvokeCommand as buildNextTabAcrossGroupsCommand } from './commands/nextTabAcrossGroups';
import { buildInvokeCommand as buildOpenTabCandyCommand } from './commands/openTabCandy';
import { buildInvokeCommand as buildPreviousTabAcrossGroupsCommand } from './commands/previousTabAcrossGroups';
import { buildInvokeCommand as buildReopenClosedTabCommand } from './commands/reopenClosedTab';
import { buildInvokeCommand as buildSearchOpenTabsCommand } from './commands/searchOpenTabs';
import {
	pruneMissingManualBackgroundFiles,
	pruneStaleOverlayContrastCache,
	syncBackgroundsFolder
} from './newtab/backgrounds';
import { syncQuotesFile } from './newtab/quotes';
import { registerClusterCreationMenu } from './obsidian/clusterMenu';
import { registerNewTabHijack } from './obsidian/newTabHijack';
import TabCandySettingTab from './obsidian/SettingsTab';
import { registerStackedTabPanes } from './obsidian/stackedTabPanes';
import { TabCandyView } from './obsidian/TabCandyView';
import {
	registerBackgroundVaultWatchers,
	registerClusterRenameWatcher,
	registerQuotesVaultWatcher
} from './obsidian/vaultWatchers';
import { checkForPluginUpdates } from './obsidian/versionCheck';
import { registerTabTracking } from './tabs/tabNavigation';
import CreateClusterModal from './ui/CreateClusterModal';
import type TabCandyPlugin from '../main';
import {
	PromptForCluster,
	TAB_CANDY_VIEW_TYPE
} from './types';

/**
 * Wires the plugin's features together: syncs, vault watchers, the view,
 * the settings tab, commands and menus. Runs once settings are loaded.
 *
 * @param plugin - The plugin, with `settingsStore` already assigned.
 */
export async function startRuntime(plugin: TabCandyPlugin): Promise<void> {
	const { app, settingsStore } = plugin;
	const registerEvent = (eventRef: EventRef): void => {
		plugin.registerEvent(eventRef);
	};

	void checkForPluginUpdates();

	// Tells Style Settings to re-scan this plugin's `@settings` block.
	app.workspace.trigger('parse-style-settings');

	await syncBackgroundsFolder(app, settingsStore);

	// Drops manually added images deleted or renamed while the plugin wasn't running.
	await pruneMissingManualBackgroundFiles(app, settingsStore);

	// Drops contrast cache entries whose image was deleted or edited while the plugin wasn't running.
	await pruneStaleOverlayContrastCache(app, settingsStore);

	registerBackgroundVaultWatchers(
		app,
		settingsStore,
		registerEvent
	);

	await syncQuotesFile(app, settingsStore);

	registerQuotesVaultWatcher(
		app,
		settingsStore,
		registerEvent
	);

	// Patches Cluster paths on rename. Missing members are kept, not pruned.
	registerClusterRenameWatcher(
		app,
		settingsStore,
		registerEvent
	);

	plugin.registerView(
		TAB_CANDY_VIEW_TYPE,
		(leaf) => new TabCandyView(settingsStore, leaf)
	);

	plugin.addSettingTab(new TabCandySettingTab(app, plugin));

	registerNewTabHijack(
		app,
		settingsStore,
		registerEvent
	);

	const promptForCluster: PromptForCluster = (onSubmit) => {
		new CreateClusterModal(app, onSubmit).open();
	};

	plugin.addCommand(buildCloseDuplicateTabsCommand(app));
	plugin.addCommand(buildCloseOtherTabsCommand(app));
	plugin.addCommand(buildCloseTabsInFolderCommand(app, settingsStore));
	plugin.addCommand(buildNextTabAcrossGroupsCommand(app));
	plugin.addCommand(buildOpenTabCandyCommand(app));
	plugin.addCommand(buildPreviousTabAcrossGroupsCommand(app));
	plugin.addCommand(buildReopenClosedTabCommand(app));
	plugin.addCommand(buildSearchOpenTabsCommand(app));
	plugin.addCommand(buildCreateClusterCommand(settingsStore, promptForCluster));
	plugin.addCommand(buildCreateClusterFromActiveTabCommand(
		app,
		settingsStore,
		promptForCluster
	));
	plugin.addCommand(buildCreateClusterFromActivePaneCommand(
		app,
		settingsStore,
		promptForCluster
	));

	registerClusterCreationMenu(
		app,
		settingsStore,
		registerEvent,
		promptForCluster
	);

	registerTabTracking(
		app,
		registerEvent
	);

	registerStackedTabPanes(
		settingsStore,
		(cleanup) => plugin.register(cleanup)
	);
}