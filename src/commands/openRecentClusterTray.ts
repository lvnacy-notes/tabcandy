/** @file The command that opens a Tray for the most recent Cluster. */
import {
	App,
	Command
} from 'obsidian';
import { getMostRecentCluster } from '../clusters/clusters';
import { openClusterTray } from '../obsidian/trayLeaves';
import SettingsStore from '../settings/SettingsStore';

/**
 * Builds the command that opens a Tray for the Cluster with the highest
 * `lastTouchedAt`. Available only when a Cluster exists.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @returns The `open-most-recent-cluster-tray` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore
): Command {
	return {
		id: 'open-recent-cluster-tray',
		name: 'Open recent cluster tray',
		checkCallback: (checking) => {
			const cluster = getMostRecentCluster(settingsStore.get().clusters);
			if (cluster === null) {
				return false;
			}
			if (!checking) {
				void openClusterTray(
					app,
					settingsStore,
					cluster.id
				);
			}
			return true;
		},
	};
}