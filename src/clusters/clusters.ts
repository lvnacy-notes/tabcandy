import { isHexColor, isRecord } from '../utils/typeGuards';
import {
	NewClusterInput,
	TabCandyCluster,
	TabCandyClusters,
	UNTITLED_CLUSTER_NAME
} from '../types';

/*
 * Cluster operations are pure: each takes the current `clusters` record and
 * returns the next one without mutating its input. An operation with nothing
 * to change returns the record it was given.
 */

/**
 * Tests whether a Cluster exists.
 *
 * @param clusters - The current Clusters.
 * @param id - Id to look up.
 * @returns True when `clusters` has an own entry for `id`.
 */
function hasCluster(clusters: TabCandyClusters, id: string): boolean {
	return Boolean(Object.prototype.hasOwnProperty.call(clusters, id));
}

/**
 * Removes repeated paths, keeping the first of each.
 *
 * @param paths - Paths to deduplicate.
 * @returns The paths without repeats, in their original order.
 */
function uniquePaths(paths: string[]): string[] {
	return paths.filter((path, index) => paths.indexOf(path) === index);
}

/**
 * Generates a random Cluster id.
 *
 * @returns 32 lowercase hex characters (128 random bits).
 */
export function generateClusterId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Adds a new Cluster. A blank name becomes `UNTITLED_CLUSTER_NAME`, a Flavor
 * that isn't a valid hex color is dropped, and repeated members are removed.
 *
 * @param clusters - The current Clusters.
 * @param input - Name, optional Flavor, optional starting members.
 * @param now - Value for `lastTouchedAt`.
 * @param id - Id for the new Cluster; generated unless given.
 * @returns The next record and the Cluster that was added.
 */
export function createCluster(
	clusters: TabCandyClusters,
	input: NewClusterInput,
	now: number = Date.now(),
	id: string = generateClusterId()
): { clusters: TabCandyClusters; cluster: TabCandyCluster } {
	const cluster: TabCandyCluster = {
		id,
		name: input.name.trim() === '' ? UNTITLED_CLUSTER_NAME : input.name,
		members: uniquePaths(input.members ?? []),
		lastTouchedAt: now,
		pairedWith: null,
	};
	if (isHexColor(input.flavor)) {
		cluster.flavor = input.flavor;
	}

	return {
		clusters: { ...clusters, [id]: cluster },
		cluster,
	};
}

/**
 * Clears the Pairing of `id` and every Pairing that points at `id`.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster.
 * @returns The next record.
 */
function clearPairingsTo(clusters: TabCandyClusters, id: string): TabCandyClusters {
	const next: TabCandyClusters = {};
	for (const [key, cluster] of Object.entries(clusters)) {
		next[key] = key === id || cluster.pairedWith === id
			? { ...cluster, pairedWith: null }
			: cluster;
	}
	return next;
}

/**
 * Deletes a Cluster and unpairs whichever Cluster was paired with it.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster to delete.
 * @returns The next record, or `clusters` itself when `id` doesn't exist.
 */
export function deleteCluster(
	clusters: TabCandyClusters,
	id: string
): TabCandyClusters {
	if (!hasCluster(clusters, id)) {
		return clusters;
	}

	const { [id]: _deleted, ...remaining } = clusters;
	return clearPairingsTo(remaining, id);
}

/**
 * Appends a path to a Cluster's members and sets `lastTouchedAt`.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster.
 * @param path - Path to add.
 * @param now - Value for `lastTouchedAt`.
 * @returns The next record, or `clusters` itself when `id` doesn't exist or
 * `path` is already a member.
 */
export function addMember(
	clusters: TabCandyClusters,
	id: string,
	path: string,
	now: number = Date.now()
): TabCandyClusters {
	if (!hasCluster(clusters, id) || clusters[id].members.includes(path)) {
		return clusters;
	}

	const cluster = clusters[id];
	return {
		...clusters,
		[id]: {
			...cluster,
			members: [...cluster.members, path],
			lastTouchedAt: now,
		},
	};
}

/**
 * Removes a path from a Cluster's members and sets `lastTouchedAt`. The path
 * need not resolve to a file.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster.
 * @param path - Path to remove.
 * @param now - Value for `lastTouchedAt`.
 * @returns The next record, or `clusters` itself when `id` doesn't exist or
 * `path` isn't a member.
 */
export function removeMember(
	clusters: TabCandyClusters,
	id: string,
	path: string,
	now: number = Date.now()
): TabCandyClusters {
	if (!hasCluster(clusters, id) || !clusters[id].members.includes(path)) {
		return clusters;
	}

	const cluster = clusters[id];
	return {
		...clusters,
		[id]: {
			...cluster,
			members: cluster.members.filter((member) => member !== path),
			lastTouchedAt: now,
		},
	};
}

/**
 * Moves the member at `fromIndex` to `toIndex`. Doesn't change
 * `lastTouchedAt`.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster.
 * @param fromIndex - Current position of the member.
 * @param toIndex - Position the member ends up at.
 * @returns The next record, or `clusters` itself when `id` doesn't exist,
 * either index isn't a valid position, or the move changes nothing.
 */
export function reorderMember(
	clusters: TabCandyClusters,
	id: string,
	fromIndex: number,
	toIndex: number
): TabCandyClusters {
	if (!hasCluster(clusters, id)) {
		return clusters;
	}

	const cluster = clusters[id];
	const lastIndex = cluster.members.length - 1;
	const isValidIndex = (index: number): boolean =>
		Number.isInteger(index) && index >= 0 && index <= lastIndex;
	if (!isValidIndex(fromIndex) || !isValidIndex(toIndex) || fromIndex === toIndex) {
		return clusters;
	}

	const members = [...cluster.members];
	const [moved] = members.splice(fromIndex, 1);
	members.splice(
		toIndex,
		0,
		moved
	);
	return {
		...clusters,
		[id]: { ...cluster, members },
	};
}

/**
 * Sets a Cluster's `lastTouchedAt`.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster.
 * @param now - The new value.
 * @returns The next record, or `clusters` itself when `id` doesn't exist.
 */
export function touchCluster(
	clusters: TabCandyClusters,
	id: string,
	now: number = Date.now()
): TabCandyClusters {
	if (!hasCluster(clusters, id)) {
		return clusters;
	}

	return {
		...clusters,
		[id]: { ...clusters[id], lastTouchedAt: now },
	};
}

/**
 * Pairs two Clusters with each other. Any other Cluster either one was
 * already paired with is unpaired. Doesn't change `lastTouchedAt`.
 *
 * @param clusters - The current Clusters.
 * @param idA - Id of the first Cluster.
 * @param idB - Id of the second Cluster.
 * @returns The next record, or `clusters` itself when either id doesn't
 * exist, the ids are equal, or the two are already paired.
 */
export function pairClusters(
	clusters: TabCandyClusters,
	idA: string,
	idB: string
): TabCandyClusters {
	if (
		idA === idB ||
		!hasCluster(clusters, idA) ||
		!hasCluster(clusters, idB) ||
		clusters[idA].pairedWith === idB
	) {
		return clusters;
	}

	const next = { ...clusters };
	for (const id of [idA, idB]) {
		const previous = clusters[id].pairedWith;
		if (
			previous !== null &&
			previous !== idA &&
			previous !== idB &&
			hasCluster(next, previous)
		) {
			next[previous] = { ...next[previous], pairedWith: null };
		}
	}
	next[idA] = { ...next[idA], pairedWith: idB };
	next[idB] = { ...next[idB], pairedWith: idA };
	return next;
}

/**
 * Unpairs a Cluster and its partner.
 *
 * @param clusters - The current Clusters.
 * @param id - Id of the Cluster.
 * @returns The next record, or `clusters` itself when `id` doesn't exist or
 * isn't paired.
 */
export function unpairCluster(
	clusters: TabCandyClusters,
	id: string
): TabCandyClusters {
	if (!hasCluster(clusters, id) || clusters[id].pairedWith === null) {
		return clusters;
	}

	return clearPairingsTo(clusters, id);
}

/**
 * Finds the Cluster with the highest `lastTouchedAt`. The first in record
 * order wins a tie.
 *
 * @param clusters - The current Clusters.
 * @returns The Cluster, or null when there are none.
 */
export function getMostRecentCluster(
	clusters: TabCandyClusters
): TabCandyCluster | null {
	let mostRecent: TabCandyCluster | null = null;
	for (const cluster of Object.values(clusters)) {
		if (mostRecent === null || cluster.lastTouchedAt > mostRecent.lastTouchedAt) {
			mostRecent = cluster;
		}
	}
	return mostRecent;
}

/**
 * Finds every Cluster that lists a path as a member.
 *
 * @param clusters - The current Clusters.
 * @param path - Path to look for.
 * @returns The matching Clusters, in record order.
 */
export function getClustersContainingPath(
	clusters: TabCandyClusters,
	path: string
): TabCandyCluster[] {
	return Object.values(clusters).filter((cluster) => cluster.members.includes(path));
}

/**
 * Replaces a path in a member list, in place. A repeat of `newPath` created
 * by the replacement is dropped.
 *
 * @param members - Member paths.
 * @param oldPath - Path to replace.
 * @param newPath - Replacement path.
 * @returns The new list, or `members` itself when `oldPath` isn't in it.
 */
function replacePathInMembers(
	members: string[],
	oldPath: string,
	newPath: string
): string[] {
	if (!members.includes(oldPath)) {
		return members;
	}

	let hasNewPath = false;
	return members
		.map((member) => (member === oldPath ? newPath : member))
		.filter((member) => {
			if (member !== newPath) {
				return true;
			}
			if (hasNewPath) {
				return false;
			}
			hasNewPath = true;
			return true;
		});
}

/**
 * Replaces a path in the `state.state.file` of every leaf node of a layout,
 * copying only the branches that change.
 *
 * @param node - A layout node, or any value inside one.
 * @param oldPath - Path to replace.
 * @param newPath - Replacement path.
 * @returns The new node, or `node` itself when nothing under it matched.
 */
function replacePathInLayout(
	node: unknown,
	oldPath: string,
	newPath: string
): unknown {
	if (Array.isArray(node)) {
		const mapped = node.map((child) => replacePathInLayout(
			child,
			oldPath,
			newPath
		));
		return mapped.some((child, index) => child !== node[index]) ? mapped : node;
	}
	if (!isRecord(node)) {
		return node;
	}

	if (node.type === 'leaf') {
		const { state } = node;
		if (isRecord(state) && isRecord(state.state) && state.state.file === oldPath) {
			return {
				...node,
				state: {
					...state,
					state: { ...state.state, file: newPath },
				},
			};
		}
		return node;
	}

	let changed = false;
	const next: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(node)) {
		next[key] = replacePathInLayout(
			value,
			oldPath,
			newPath
		);
		if (next[key] !== value) {
			changed = true;
		}
	}
	return changed ? next : node;
}

/**
 * Replaces a file path in every Cluster: in `members`, at the same position,
 * and in every matching leaf node of `layoutSnapshot`.
 *
 * @param clusters - The current Clusters.
 * @param oldPath - Path to replace.
 * @param newPath - Replacement path.
 * @returns The next record, or `clusters` itself when `oldPath` isn't stored
 * anywhere or the two paths are equal.
 */
export function replaceMemberPath(
	clusters: TabCandyClusters,
	oldPath: string,
	newPath: string
): TabCandyClusters {
	if (oldPath === newPath) {
		return clusters;
	}

	let changed = false;
	const next: TabCandyClusters = {};
	for (const [id, cluster] of Object.entries(clusters)) {
		const members = replacePathInMembers(
			cluster.members,
			oldPath,
			newPath
		);
		const layoutSnapshot = cluster.layoutSnapshot === undefined
			? undefined
			: replacePathInLayout(
				cluster.layoutSnapshot,
				oldPath,
				newPath
			);

		if (members === cluster.members && layoutSnapshot === cluster.layoutSnapshot) {
			next[id] = cluster;
			continue;
		}

		changed = true;
		next[id] = { ...cluster, members };
		if (isRecord(layoutSnapshot)) {
			next[id].layoutSnapshot = layoutSnapshot;
		}
	}
	return changed ? next : clusters;
}