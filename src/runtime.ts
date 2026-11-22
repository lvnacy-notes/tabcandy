/** @file Wires the plugin's features together. */
import type { EventRef } from 'obsidian';
import { promptAndCreate } from './clusters/clusterCreation';
import { promptAndPair, promptAndUnlink } from './clusters/clusterPairing';
import { buildCommands } from './commands/commandRegistry';
import {
	pruneMissingManualBackgroundFiles,
	pruneStaleOverlayContrastCache,
	syncBackgroundsFolder
} from './newtab/backgrounds';
import { syncQuotesFile } from './newtab/quotes';
import { ClusterSidebarView } from './obsidian/ClusterSidebarView';
import { ClusterTrayView } from './obsidian/ClusterTrayView';
import { registerClusterMembershipMenu } from './obsidian/clusterMembershipMenu';
import { registerClusterCreationMenu } from './obsidian/clusterMenu';
import { registerNewTabHijack } from './obsidian/newTabHijack';
import TabCandySettingTab from './obsidian/SettingsTab';
import { registerStackedTabPanes } from './obsidian/stackedTabPanes';
import { TabCandyView } from './obsidian/TabCandyView';
import TrayReturnTracker from './obsidian/TrayReturnTracker';
import {
	registerBackgroundVaultWatchers,
	registerClusterRenameWatcher,
	registerQuotesVaultWatcher
} from './obsidian/vaultWatchers';
import { checkForPluginUpdates } from './obsidian/versionCheck';
import { registerTabTracking } from './tabs/tabNavigation';
import ChooseClusterModal from './ui/ChooseClusterModal';
import ConfirmModal from './ui/ConfirmModal';
import CreateClusterModal from './ui/CreateClusterModal';
import PairClustersModal from './ui/PairClustersModal';
import RemoveFromClustersModal from './ui/RemoveFromClustersModal';
import type TabCandyPlugin from '../main';
import {
	CLUSTER_SIDEBAR_VIEW_TYPE,
	CLUSTER_TRAY_VIEW_TYPE,
	PromptForCluster,
	PromptForClusterChoice,
	PromptForClusterPair,
	PromptForClusterRemoval,
	PromptForConfirmation,
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
	/**
	 * Registers an event with the plugin.
	 *
	 * @param eventRef - The event to register.
	 */
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

	const promptForClusterChoice: PromptForClusterChoice = (clusters, onSubmit, labels) => {
		new ChooseClusterModal(
			app,
			clusters,
			onSubmit,
			labels
		).open();
	};

	const promptForClusterRemoval: PromptForClusterRemoval = (clusters, onSubmit) => {
		new RemoveFromClustersModal(app, clusters, onSubmit).open();
	};

	const promptForClusterPair: PromptForClusterPair = (clusters, onSubmit) => {
		new PairClustersModal(
			app,
			clusters,
			onSubmit
		).open();
	};

	const promptForConfirmation: PromptForConfirmation = (title, text, confirmLabel, onConfirm) => {
		new ConfirmModal(
			app,
			onConfirm,
			title,
			text,
			confirmLabel
		).open();
	};

	plugin.registerView(
		CLUSTER_SIDEBAR_VIEW_TYPE,
		(leaf) => new ClusterSidebarView(
			settingsStore,
			() => {
				promptAndCreate(
					settingsStore,
					promptForCluster,
					[]
				);
			},
			(id) => {
				promptAndPair(
					settingsStore,
					promptForClusterChoice,
					promptForConfirmation,
					id
				);
			},
			(id) => {
				const cluster = settingsStore.get().clusters[id];
				if (cluster !== undefined) {
					promptAndUnlink(
						settingsStore,
						promptForClusterChoice,
						promptForConfirmation,
						[cluster]
					);
				}
			},
			leaf
		)
	);

	const trayReturn = new TrayReturnTracker(app, settingsStore);
	registerEvent(app.workspace.on('layout-change', () => {
		void trayReturn.handleLayoutChange();
	}));

	plugin.registerView(
		CLUSTER_TRAY_VIEW_TYPE,
		(leaf) => new ClusterTrayView(
			settingsStore,
			trayReturn,
			leaf
		)
	);

	for (const command of buildCommands({
		app,
		settingsStore,
		promptForCluster,
		promptForClusterChoice,
		promptForClusterPair,
		promptForClusterRemoval,
		promptForConfirmation,
	})) {
		plugin.addCommand(command);
	}

	registerClusterCreationMenu(
		app,
		settingsStore,
		registerEvent,
		promptForCluster
	);

	registerClusterMembershipMenu(
		app,
		settingsStore,
		registerEvent,
		promptForClusterChoice,
		promptForClusterRemoval
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