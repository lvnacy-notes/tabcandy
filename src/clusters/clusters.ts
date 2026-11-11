import {
	App,
	EventRef
} from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import { isHexColor, isRecord } from '../utils/typeGuards';
import {
	TabCandyCluster,
	TabCandyClusters,
	UNTITLED_CLUSTER_NAME
} from '../types';

/*
 * Cluster operations are pure: each takes the current `clusters` record and
 * returns the next one, never mutating its input. When an operation has
 * nothing to change (unknown id, member already present, ...) it returns the
 * same record it was given, so a caller can tell "nothing happened" by
 * reference and skip a pointless save:
 *
 *   const next = addMember(clusters, id, path);
 *   if (next !== clusters) {
 *       await settingsStore.update({ clusters: next });
 *   }
 */

/** What a new Cluster is created from. */
export interface NewClusterInput {
	name: string;
	/** Dropped unless it is a valid hex color. */
	flavor?: string;
	/** Initial members, in order. Duplicates are collapsed. */
	members?: string[];
}

/** True when `clusters` has an own entry for `id`. */
function hasCluster(clusters: TabCandyClusters, id: string): boolean {
	return Boolean(Object.prototype.hasOwnProperty.call(clusters, id));
}

/** `paths` with repeats removed, keeping the first of each. */
function uniquePaths(paths: string[]): string[] {
	return paths.filter((path, index) => paths.indexOf(path) === index);
}

/**
 * A new random Cluster id: 128 random bits as 32 hex characters.
 *
 * Built on `crypto.getRandomValues()` rather than `crypto.randomUUID()`,
 * because the latter is only exposed in secure contexts and the plugin has
 * to behave the same on Obsidian mobile.
 */
export function generateClusterId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Adds a new Cluster. An empty `members` list is a normal state; a blank
 * name falls back to the untitled name.
 *
 * @param clusters - The current Clusters.
 * @param input - Name, optional Flavor, optional starting members.
 * @param now - Timestamp for `lastTouchedAt`.
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
 * Clears every Pairing that points at `id`, and `id`'s own. Scans the
 * whole record rather than trusting that the partner points back.
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
 * Deletes a Cluster and decouples whichever Cluster was paired with it.
 *
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
 * Appends a path to a Cluster's members and bumps `lastTouchedAt`. Adding a
 * path that is already a member changes nothing.
 *
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
 * Removes a path from a Cluster's members and bumps `lastTouchedAt`. Works
 * the same on a path that no longer resolves to a file.
 *
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
 * Moves the member at `fromIndex` so it ends up at `toIndex`. Doesn't bump
 * `lastTouchedAt`: reordering isn't one of the things that counts as touching.
 *
 * @returns The next record, or `clusters` itself when `id` doesn't exist,
 * either index is not a valid position, or the move is a no-op.
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
 * Sets a Cluster's `lastTouchedAt`, for events like a Tray being opened.
 *
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
 * Pairs two Clusters with each other. Pairing is strictly 1:1, so any
 * other Cluster either side was already paired with is unpaired first.
 * Doesn't touch `lastTouchedAt`: a Pairing affects two Clusters at once,
 * and bumping both would tie.
 *
 * @returns The next record, or `clusters` itself when either id doesn't
 * exist, the ids are the same, or the two are already paired.
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
 * The Cluster with the highest `lastTouchedAt`, which is what the "most
 * recent Cluster" fast paths act on. A tie goes to the Cluster that comes
 * first in the record.
 *
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

/** Every Cluster that lists `path` as a member, in record order. */
export function getClustersContainingPath(
	clusters: TabCandyClusters,
	path: string
): TabCandyCluster[] {
	return Object.values(clusters).filter((cluster) => cluster.members.includes(path));
}

/**
 * `members` with `oldPath` replaced by `newPath` in place. If `newPath` was
 * already a member, the repeat is dropped rather than leaving the list
 * with the same file twice.
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
 * Walks a captured layout and replaces `oldPath` with `newPath` in the file
 * path of every leaf node (`state.state.file`), copying only the branches
 * that change. Returns the node it was given when nothing under it matched.
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
 * Replaces a file path everywhere a Cluster stores one: in `members`, at the
 * same position, and in every matching leaf node of `layoutSnapshot`. Every
 * Cluster is searched. This is the one path-patch operation behind both
 * triggers: the vault's rename event, and resolving a missing member by
 * hand.
 *
 * @param clusters - The current Clusters.
 * @param oldPath - The path to find.
 * @param newPath - The path to put in its place.
 * @returns The next record, or `clusters` itself when `oldPath` isn't
 * stored anywhere (or the two paths are equal).
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

/**
 * Keeps Cluster membership current when Obsidian renames or moves a file.
 * Missing members are deliberately not pruned anywhere: a path that stops
 * resolving (a rename Obsidian didn't see, a deletion) stays in `members`
 * until the user removes or resolves it.
 *
 * `registerEvent` is passed in, as in `registerBackgroundVaultWatchers()`,
 * so the caller's own `Component.registerEvent()` owns the `EventRef`.
 */
export function registerClusterRenameWatcher(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void
): void {
	registerEvent(
		app.vault.on('rename', (file, oldPath) => {
			const { clusters } = settingsStore.get();
			const next = replaceMemberPath(
				clusters,
				oldPath,
				file.path
			);
			if (next !== clusters) {
				void settingsStore.update({ clusters: next });
			}
		})
	);
}