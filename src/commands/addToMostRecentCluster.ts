/** @file The add-to-most-recent-cluster command. */
import { App, Command } from 'obsidian';
import { addToMostRecentCluster, getActiveTabPath } from '../clusters/clusterMembership';
import SettingsStore from '../settings/SettingsStore';

/**
 * Builds the command that adds the most recent tab's file to the Cluster
 * with the highest `lastTouchedAt`. Available only when that tab is
 * file-backed and a Cluster exists.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @returns The `add-to-most-recent-cluster` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore
): Command {
	return {
		id: 'add-to-most-recent-cluster',
		name: 'Add to most recent cluster',
		checkCallback: (checking) => {
			const path = getActiveTabPath(app);
			if (path === null || Object.keys(settingsStore.get().clusters).length === 0) {
				return false;
			}
			if (!checking) {
				addToMostRecentCluster(settingsStore, path);
			}
			return true;
		},
	};
}