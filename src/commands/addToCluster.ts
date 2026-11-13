/** @file The add-to-cluster command. */
import { App, Command } from 'obsidian';
import { getActiveTabPath, promptAndAdd } from '../clusters/clusterMembership';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice } from '../types';

/**
 * Builds the command that adds the most recent tab's file to a chosen
 * Cluster. Available only when that tab is file-backed and a Cluster exists.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice of Cluster.
 * @returns The `add-to-cluster` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForClusterChoice
): Command {
	return {
		id: 'add-to-cluster',
		name: 'Add to cluster',
		checkCallback: (checking) => {
			const path = getActiveTabPath(app);
			if (path === null || Object.keys(settingsStore.get().clusters).length === 0) {
				return false;
			}
			if (!checking) {
				promptAndAdd(
					settingsStore,
					prompt,
					path
				);
			}
			return true;
		},
	};
}