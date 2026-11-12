import { Command } from 'obsidian';
import { promptAndCreate } from '../clusters/clusterCreation';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForCluster } from '../types';

/**
 * Builds the command that creates an empty Cluster.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the Cluster details.
 * @returns The `create-cluster` command.
 */
export function buildInvokeCommand(
	settingsStore: SettingsStore,
	prompt: PromptForCluster
): Command {
	return {
		id: 'create-cluster',
		name: 'Create cluster',
		callback: () => {
			promptAndCreate(
				settingsStore,
				prompt,
				[]
			);
		},
	};
}