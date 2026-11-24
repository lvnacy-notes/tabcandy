/** @file The edit-cluster command. */
import { Command } from 'obsidian';
import { promptAndEdit } from '../clusters/clusterManagement';
import SettingsStore from '../settings/SettingsStore';
import type {
	PromptForCluster,
	PromptForClusterChoice
} from '../types';

/**
 * Builds the command that edits a Cluster's name and Flavor. Available when a Cluster exists and asks which.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param promptForChoice - Collects the choice of Cluster.
 * @param promptForDetails - Collects the new details.
 * @returns The `edit-cluster` command.
 */
export function buildInvokeCommand(
	settingsStore: SettingsStore,
	promptForChoice: PromptForClusterChoice,
	promptForDetails: PromptForCluster
): Command {
	return {
		id: 'edit-cluster',
		name: 'Edit cluster',
		checkCallback: (checking) => {
			const clusters = Object.values(settingsStore.get().clusters);
			if (clusters.length === 0) {
				return false;
			}
			if (!checking) {
				promptForChoice(
					clusters,
					(id) => {
						promptAndEdit(
							settingsStore,
							promptForDetails,
							id
						);
					},
					{
						action: 'Edit',
						title: 'Edit cluster'
					}
				);
			}
			return true;
		},
	};
}