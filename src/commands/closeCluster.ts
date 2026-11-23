/** @file The close-cluster command. */
import {
	App,
	Command
} from 'obsidian';
import {
	closeCluster,
	getOpenMembers
} from '../obsidian/clusterOpenClose';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice } from '../types';

/**
 * Builds the command that closes a Cluster's open members. Available when a Cluster has an open member and asks which among those.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice of Cluster.
 * @returns The `close-cluster` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForClusterChoice
): Command {
	return {
		id: 'close-cluster',
		name: 'Close cluster',
		checkCallback: (checking) => {
			const open = Object.values(settingsStore.get().clusters)
				.filter((cluster) => getOpenMembers(
					app,
					cluster
				).size > 0);
			if (open.length === 0) {
				return false;
			}
			if (!checking) {
				prompt(
					open,
					(id) => {
						void closeCluster(
							app,
							settingsStore,
							id
						);
					},
					{
						action: 'Close',
						title: 'Close cluster'
					}
				);
			}
			return true;
		},
	};
}