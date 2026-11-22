/** @file The open-cluster command. */
import { App, Command } from 'obsidian';
import { openCluster } from '../obsidian/clusterOpenClose';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice } from '../types';

/**
 * Builds the command that opens a Cluster's members as tabs. Available when a Cluster exists and asks which.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice of Cluster.
 * @returns The `open-cluster` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForClusterChoice
): Command {
	return {
		id: 'open-cluster',
		name: 'Open cluster',
		checkCallback: (checking) => {
			const clusters = Object.values(settingsStore.get().clusters);
			if (clusters.length === 0) {
				return false;
			}
			if (!checking) {
				prompt(
					clusters,
					(id) => {
						void openCluster(
							app,
							settingsStore,
							id
						);
					},
					{ action: 'Open', title: 'Open cluster' }
				);
			}
			return true;
		},
	};
}