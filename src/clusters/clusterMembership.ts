/** @file Adding files to Clusters, removing them, reordering members and resolving missing ones. */
import {
	App,
	Notice,
	TFile
} from 'obsidian';
import { getTabPath } from './clusterCreation';
import {
	addMember,
	getClustersContainingPath,
	getMostRecentCluster,
	removeMember,
	reorderMember,
	replaceMemberPath
} from './clusters';
import SettingsStore from '../settings/SettingsStore';
import type {
	PromptForClusterChoice,
	PromptForClusterRemoval,
	TabCandyCluster,
	TabCandyClusters
} from '../types';

/**
 * Adds a file to a Cluster and saves. Saves nothing when the Cluster does
 * not exist or already holds the file.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param path - Vault-relative file path.
 * @returns Whether the file was added.
 */
export async function addPathToCluster(
	settingsStore: SettingsStore,
	clusterId: string,
	path: string
): Promise<boolean> {
	const { clusters } = settingsStore.get();
	const next = addMember(
		clusters,
		clusterId,
		path
	);
	if (next === clusters) {
		return false;
	}
	await settingsStore.update({ clusters: next });
	return true;
}

/**
 * Adds a file to the Cluster with the highest `lastTouchedAt` and shows a
 * notice. Does nothing when there are no Clusters.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param path - Vault-relative file path.
 */
export function addToMostRecentCluster(
	settingsStore: SettingsStore,
	path: string
): void {
	const cluster = getMostRecentCluster(settingsStore.get().clusters);
	if (cluster === null) {
		return;
	}
	void addPathToCluster(
		settingsStore,
		cluster.id,
		path
	).then((added) => {
		new Notice(describeAddition(
			cluster.name,
			added
		));
	});
}

/**
 * Describes the outcome of adding a file to a Cluster.
 *
 * @param clusterName - Name of the Cluster.
 * @param added - Whether the file was added.
 * @returns Notice text.
 */
export function describeAddition(clusterName: string, added: boolean): string {
	return added ? `Added to ${ clusterName }.` : `Already in ${ clusterName }.`;
}

/**
 * Describes the outcome of removing a file from Clusters.
 *
 * @param count - Number of Clusters the file was removed from.
 * @returns Notice text.
 */
export function describeRemoval(count: number): string {
	return `Removed from ${ count } ${ count === 1 ? 'cluster' : 'clusters' }.`;
}

/**
 * Reads the file path of the most recent tab.
 *
 * @param app - The Obsidian app.
 * @returns The path, or null when there is no most recent tab or it has no file.
 */
export function getActiveTabPath(app: App): string | null {
	const leaf = app.workspace.getMostRecentLeaf();
	return leaf === null ? null : getTabPath(leaf);
}

/**
 * Removes the member at `index` from the Cluster paired with `source`. Goes one hop and no further.
 *
 * @param clusters - The Clusters after the original removal.
 * @param source - The Cluster the removal was made on, as it was before.
 * @param index - Position the removed member held in `source`.
 * @param skipIds - Ids of Clusters the user acted on directly. Never mirrored onto.
 * @returns The next record, or `clusters` itself when `source` has no pair, the pair was acted on directly, or it has no member at `index`.
 */
function mirrorRemoval(
	clusters: TabCandyClusters,
	source: TabCandyCluster,
	index: number,
	skipIds: string[]
): TabCandyClusters {
	const partner = source.pairedWith === null ? undefined : clusters[source.pairedWith];
	if (partner === undefined || skipIds.includes(partner.id)) {
		return clusters;
	}

	const path = partner.members[index];
	return path === undefined
		? clusters
		: removeMember(
			clusters,
			partner.id,
			path
		);
}

/**
 * Opens a member in the active pane. Does nothing when the file is missing.
 *
 * @param app - The Obsidian app.
 * @param path - Vault-relative file path.
 */
export async function openMemberFile(app: App, path: string): Promise<void> {
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) {
		return;
	}
	await app.workspace.getLeaf(false).openFile(file);
}

/**
 * Asks which Cluster to add a file to, then adds it and shows a notice.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice.
 * @param path - Vault-relative file path.
 */
export function promptAndAdd(
	settingsStore: SettingsStore,
	prompt: PromptForClusterChoice,
	path: string
): void {
	const clusters = Object.values(settingsStore.get().clusters);
	if (clusters.length === 0) {
		return;
	}
	prompt(clusters, (id) => {
		const cluster = settingsStore.get().clusters[id];
		if (cluster === undefined) {
			return;
		}
		void addPathToCluster(
			settingsStore,
			id,
			path
		).then((added) => {
			new Notice(describeAddition(
				cluster.name,
				added
			));
		});
	});
}

/**
 * Removes a file from the Clusters holding it. Removes it directly from a
 * single Cluster, and asks which to remove it from when there are several.
 * Does nothing when no Cluster holds the file.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice when more than one Cluster holds the file.
 * @param path - Vault-relative file path.
 */
export function promptAndRemove(
	settingsStore: SettingsStore,
	prompt: PromptForClusterRemoval,
	path: string
): void {
	const holding = getClustersContainingPath(
		settingsStore.get().clusters,
		path
	);
	if (holding.length === 0) {
		return;
	}
	if (holding.length === 1) {
		void removePathFromClusters(
			settingsStore,
			[holding[0].id],
			path
		).then((count) => {
			new Notice(describeRemoval(count));
		});
		return;
	}
	prompt(holding, (ids) => {
		void removePathFromClusters(
			settingsStore,
			ids,
			path
		).then((count) => {
			new Notice(describeRemoval(count));
		});
	});
}

/**
 * Removes the given paths from a Cluster in one save. Saves nothing when the
 * Cluster holds none of them.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param paths - Member paths to remove.
 * @returns Whether anything was removed.
 */
export async function removeMissingMembers(
	settingsStore: SettingsStore,
	clusterId: string,
	paths: string[]
): Promise<boolean> {
	const { clusters } = settingsStore.get();
	const next = paths.reduce(
		(current, path) => removeMember(
			current,
			clusterId,
			path
		),
		clusters
	);
	if (next === clusters) {
		return false;
	}

	await settingsStore.update({ clusters: next });
	return true;
}

/**
 * Removes a file from each listed Cluster in one save. Saves nothing when
 * no listed Cluster holds the file.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param clusterIds - Ids of the Clusters.
 * @param path - Vault-relative file path.
 * @returns The number of Clusters the file was removed from.
 */
export async function removePathFromClusters(
	settingsStore: SettingsStore,
	clusterIds: string[],
	path: string
): Promise<number> {
	const {
		clusters,
		keepPairedClustersInSync
	} = settingsStore.get();
	let next = clusters;
	let count = 0;
	for (const id of clusterIds) {
		const after = removeMember(
			next,
			id,
			path
		);
		if (after !== next) {
			next = after;
			count += 1;
			if (keepPairedClustersInSync) {
				next = mirrorRemoval(
					next,
					clusters[id],
					clusters[id].members.indexOf(path),
					clusterIds
				);
			}
		}
	}
	if (count > 0) {
		await settingsStore.update({ clusters: next });
	}
	return count;
}

/**
 * Moves a member to a new position in a Cluster and saves. Saves nothing
 * when the move changes nothing.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param fromIndex - Current position of the member.
 * @param toIndex - Position the member ends up at.
 * @returns Whether the order changed.
 */
export async function reorderClusterMember(
	settingsStore: SettingsStore,
	clusterId: string,
	fromIndex: number,
	toIndex: number
): Promise<boolean> {
	const {
		clusters,
		keepPairedClustersInSync
	} = settingsStore.get();
	let next = reorderMember(
		clusters,
		clusterId,
		fromIndex,
		toIndex
	);
	if (next === clusters) {
		return false;
	}

	const partnerId = clusters[clusterId].pairedWith;
	if (keepPairedClustersInSync && partnerId !== null) {
		next = reorderMember(
			next,
			partnerId,
			fromIndex,
			toIndex
		);
	}

	await settingsStore.update({ clusters: next });
	return true;
}

/**
 * Replaces a missing path with another file in one Cluster, in `members` and
 * in its `layoutSnapshot`, and saves. Other Clusters holding the same path are
 * left as they are. Saves nothing when the Cluster doesn't exist or doesn't
 * hold the stale path.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param stalePath - The missing member path.
 * @param newPath - Vault-relative path of the file to use instead.
 * @returns Whether anything was replaced.
 */
export async function resolveMissingMember(
	settingsStore: SettingsStore,
	clusterId: string,
	stalePath: string,
	newPath: string
): Promise<boolean> {
	const { clusters } = settingsStore.get();
	const cluster = clusters[clusterId];
	if (cluster === undefined) {
		return false;
	}

	const alone = { [clusterId]: cluster };
	const replaced = replaceMemberPath(
		alone,
		stalePath,
		newPath
	);
	if (replaced === alone) {
		return false;
	}

	await settingsStore.update({ clusters: {
		...clusters,
		[clusterId]: replaced[clusterId]
	} });
	return true;
}