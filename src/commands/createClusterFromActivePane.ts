import { App, Command } from 'obsidian';
import { getPanePaths, promptAndCreate } from '../clusters/clusterCreation';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForCluster } from '../types';

/**
 * Builds the command that creates a Cluster from the file-backed tabs of the
 * most recent tab's pane. Available only when the pane has any.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the Cluster details.
 * @returns The `create-cluster-from-active-pane` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForCluster
): Command {
	return {
		id: 'create-cluster-from-active-pane',
		name: 'Create cluster from active pane',
		checkCallback: (checking) => {
			const leaf = app.workspace.getMostRecentLeaf();
			const paths = leaf === null ? [] : getPanePaths(app, leaf);
			if (paths.length === 0) {
				return false;
			}
			if (!checking) {
				promptAndCreate(
					settingsStore,
					prompt,
					paths
				);
			}
			return true;
		},
	};
}