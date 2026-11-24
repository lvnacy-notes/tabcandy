/** @file The delete-cluster command. */
import { Command } from 'obsidian';
import { promptAndDelete } from '../clusters/clusterManagement';
import SettingsStore from '../settings/SettingsStore';
import type {
	PromptForClusterChoice,
	PromptForConfirmation
} from '../types';

/**
 * Builds the command that deletes a Cluster after a confirmation. Available when a Cluster exists and asks which.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice of Cluster.
 * @param confirm - Collects the confirmation.
 * @returns The `delete-cluster` command.
 */
export function buildInvokeCommand(
	settingsStore: SettingsStore,
	prompt: PromptForClusterChoice,
	confirm: PromptForConfirmation
): Command {
	return {
		id: 'delete-cluster',
		name: 'Delete cluster',
		checkCallback: (checking) => {
			const clusters = Object.values(settingsStore.get().clusters);
			if (clusters.length === 0) {
				return false;
			}
			if (!checking) {
				prompt(
					clusters,
					(id) => {
						promptAndDelete(
							settingsStore,
							confirm,
							id
						);
					},
					{
						action: 'Delete',
						title: 'Delete cluster'
					}
				);
			}
			return true;
		},
	};
}