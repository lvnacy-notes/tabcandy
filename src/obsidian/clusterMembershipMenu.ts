/** @file Tab-header context menu items that add a file to Clusters and remove it from them. */
import { App, EventRef } from 'obsidian';
import { getTabPath } from '../clusters/clusterCreation';
import {
	addToMostRecentCluster,
	promptAndAdd,
	promptAndRemove
} from '../clusters/clusterMembership';
import { getClustersContainingPath, getMostRecentCluster } from '../clusters/clusters';
import SettingsStore from '../settings/SettingsStore';
import {
	TAB_HEADER_SOURCE,
	type PromptForClusterChoice,
	type PromptForClusterRemoval
} from '../types';

/**
 * Adds "Add to cluster", "Add to [most recent Cluster]" and "Remove from
 * cluster" to a tab header's context menu. Add items appear for a
 * file-backed tab when a Cluster exists, the most recent one only when it
 * does not already hold the file. Remove appears when a Cluster holds the file.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param registerEvent - Registers the listener with the owning component.
 * @param promptToAdd - Collects the choice of Cluster to add to.
 * @param promptToRemove - Collects the choice of Clusters to remove from.
 */
export function registerClusterMembershipMenu(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void,
	promptToAdd: PromptForClusterChoice,
	promptToRemove: PromptForClusterRemoval
): void {
	registerEvent(
		app.workspace.on('file-menu', (menu, _file, source, leaf) => {
			if (source !== TAB_HEADER_SOURCE || leaf === undefined) {
				return;
			}

			const path = getTabPath(leaf);
			if (path === null) {
				return;
			}

			const { clusters } = settingsStore.get();
			if (Object.keys(clusters).length > 0) {
				menu.addItem((item) => {
					item
						.setTitle('Add to cluster')
						.setIcon('layers')
						.onClick(() => {
							promptAndAdd(
								settingsStore,
								promptToAdd,
								path
							);
						});
				});
			}

			const mostRecent = getMostRecentCluster(clusters);
			if (mostRecent !== null && !mostRecent.members.includes(path)) {
				menu.addItem((item) => {
					item
						.setTitle(`Add to ${ mostRecent.name }`)
						.setIcon('layers')
						.onClick(() => {
							addToMostRecentCluster(settingsStore, path);
						});
				});
			}

			if (getClustersContainingPath(clusters, path).length > 0) {
				menu.addItem((item) => {
					item
						.setTitle('Remove from cluster')
						.setIcon('layers')
						.onClick(() => {
							promptAndRemove(
								settingsStore,
								promptToRemove,
								path
							);
						});
				});
			}
		})
	);
}