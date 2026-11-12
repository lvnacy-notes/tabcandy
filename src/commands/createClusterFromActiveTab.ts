import { App, Command } from 'obsidian';
import { getTabPath, promptAndCreate } from '../clusters/clusterCreation';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForCluster } from '../types';

/**
 * Builds the command that creates a Cluster from the most recent tab's file.
 * Available only when that tab is file-backed.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the Cluster details.
 * @returns The `create-cluster-from-active-tab` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForCluster
): Command {
	return {
		id: 'create-cluster-from-active-tab',
		name: 'Create cluster from active tab',
		checkCallback: (checking) => {
			const leaf = app.workspace.getMostRecentLeaf();
			const path = leaf === null ? null : getTabPath(leaf);
			if (path === null) {
				return false;
			}
			if (!checking) {
				promptAndCreate(
					settingsStore,
					prompt,
					[path]
				);
			}
			return true;
		},
	};
}