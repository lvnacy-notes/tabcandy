/** @file Creating, editing and deleting Clusters. */
import { Notice } from 'obsidian';
import {
	createCluster,
	deleteCluster,
	updateCluster
} from './clusters';
import SettingsStore from '../settings/SettingsStore';
import type {
	ClusterDraft,
	PromptForCluster,
	PromptForConfirmation,
	TabCandyCluster
} from '../types';

/**
 * Creates a Cluster from a draft and saves it.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param draft - Name and optional Flavor.
 * @param members - Starting member paths, in order.
 * @param now - Value for `lastTouchedAt`.
 * @returns The new Cluster.
 */
export async function createClusterFromDraft(
	settingsStore: SettingsStore,
	draft: ClusterDraft,
	members: string[],
	now: number = Date.now()
): Promise<TabCandyCluster> {
	const result = createCluster(
		settingsStore.get().clusters,
		{
			name: draft.name,
			flavor: draft.flavor,
			members,
		},
		now
	);
	await settingsStore.update({ clusters: result.clusters });
	return result.cluster;
}

/**
 * Describes a newly created Cluster for a notice.
 *
 * @param cluster - The new Cluster.
 * @returns A one-line message with the name and member count.
 */
export function describeNewCluster(cluster: TabCandyCluster): string {
	const count = cluster.members.length;
	if (count === 0) {
		return `Created empty Cluster "${ cluster.name }".`;
	}
	return `Created Cluster "${ cluster.name }" with ${ count } ${ count === 1 ? 'tab' : 'tabs' }.`;
}

/**
 * Prompts for Cluster details, then creates and saves the Cluster and
 * shows a notice.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the draft.
 * @param members - Starting member paths, in order.
 */
export function promptAndCreate(
	settingsStore: SettingsStore,
	prompt: PromptForCluster,
	members: string[]
): void {
	prompt((draft) => {
		void createClusterFromDraft(
			settingsStore,
			draft,
			members
		).then((cluster) => {
			new Notice(describeNewCluster(cluster));
		});
	});
}

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