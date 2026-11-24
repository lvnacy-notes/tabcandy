/** @file Editing and deleting Clusters. */
import {
	deleteCluster,
	updateCluster
} from './clusters';
import SettingsStore from '../settings/SettingsStore';
import type {
	PromptForCluster,
	PromptForConfirmation
} from '../types';

/**
 * Asks for confirmation, then deletes a Cluster and saves. Does nothing when the Cluster doesn't exist.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param confirm - Collects the confirmation.
 * @param id - Id of the Cluster.
 */
export function promptAndDelete(
	settingsStore: SettingsStore,
	confirm: PromptForConfirmation,
	id: string
): void {
	const cluster = settingsStore.get().clusters[id];
	if (cluster === undefined) {
		return;
	}

	confirm(
		`Delete cluster '${ cluster.name }'?`,
		'Its tabs stay open. This can\'t be undone.',
		'Delete',
		() => {
			const { clusters } = settingsStore.get();
			const next = deleteCluster(
				clusters,
				id
			);
			if (next !== clusters) {
				void settingsStore.update({ clusters: next });
			}
		}
	);
}

/**
 * Asks for new details with the Cluster's current ones filled in, then saves them. Does nothing when the Cluster doesn't exist.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the details.
 * @param id - Id of the Cluster.
 */
export function promptAndEdit(
	settingsStore: SettingsStore,
	prompt: PromptForCluster,
	id: string
): void {
	const cluster = settingsStore.get().clusters[id];
	if (cluster === undefined) {
		return;
	}

	prompt(
		(draft) => {
			const { clusters } = settingsStore.get();
			const next = updateCluster(
				clusters,
				id,
				draft
			);
			if (next !== clusters) {
				void settingsStore.update({ clusters: next });
			}
		},
		{
			name: cluster.name,
			flavor: cluster.flavor
		}
	);
}