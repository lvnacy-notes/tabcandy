/** @file Opens and closes a Cluster: layout capture, layout restore and the mirror onto a paired Cluster. */
import {
	App,
	Notice,
	TFile,
	WorkspaceLeaf
} from 'obsidian';
import { getTabPath } from '../tabs/tabPaths';
import {
	setLayoutSnapshot,
	touchCluster
} from '../clusters/clusters';
import {
	flattenPlan,
	getPlanPaths,
	planRestore,
	pruneLayout
} from '../clusters/layoutSnapshot';
import SettingsStore from '../settings/SettingsStore';
import type {
	RestorePlan,
	TabCandyCluster
} from '../types';
import { isRecord } from '../utils/typeGuards';

/**
 * Captures the layout of the open members of a Cluster and stores it. Keeps the existing snapshot when no member is open.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param openPaths - Paths of the open members.
 */
async function captureLayout(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string,
	openPaths: ReadonlySet<string>
): Promise<void> {
	const layout: unknown = app.workspace.getLayout();
	const snapshot = isRecord(layout)
		? pruneLayout(
			layout['main'],
			(path) => openPaths.has(path)
		)
		: null;
	if (snapshot === null) {
		return;
	}

	const { clusters } = settingsStore.get();
	const next = setLayoutSnapshot(
		clusters,
		clusterId,
		snapshot
	);
	if (next !== clusters) {
		await settingsStore.update({ clusters: next });
	}
}

/**
 * Closes a Cluster: captures its layout, then closes every open member that is not pinned. With `keepPairedClustersInSync` on, does the same to its paired Cluster. Closing never changes `lastTouchedAt`.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 */
export async function closeCluster(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string
): Promise<void> {
	const {
		clusters,
		keepPairedClustersInSync
	} = settingsStore.get();
	const cluster = clusters[clusterId];
	if (cluster === undefined) {
		return;
	}

	await closeOne(
		app,
		settingsStore,
		clusterId
	);
	if (keepPairedClustersInSync && cluster.pairedWith !== null) {
		await closeOne(
			app,
			settingsStore,
			cluster.pairedWith
		);
	}
}

/**
 * Closes a Cluster without mirroring: captures its layout, then closes every open member that is not pinned. Does not change `lastTouchedAt`.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 */
async function closeOne(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string
): Promise<void> {
	const cluster = settingsStore.get().clusters[clusterId];
	if (cluster === undefined) {
		return;
	}

	const open = getOpenMembers(
		app,
		cluster
	);
	if (open.size === 0) {
		return;
	}

	await captureLayout(
		app,
		settingsStore,
		clusterId,
		new Set(open.keys())
	);

	let closed = 0;
	let pinned = 0;
	for (const leaves of open.values()) {
		for (const leaf of leaves) {
			if (leaf.getViewState().pinned === true) {
				pinned += 1;
			} else {
				leaf.detach();
				closed += 1;
			}
		}
	}

	const closedText = `Closed ${ closed } ${ closed === 1 ? 'tab' : 'tabs' }.`;
	new Notice(pinned === 0 ? closedText : `${ closedText } ${ pinned } pinned stayed open.`);
}

/**
 * Lists the root leaves showing each member of a Cluster.
 *
 * @param app - The Obsidian app.
 * @param cluster - The Cluster.
 * @returns The leaves by member path, holding only members that are open.
 */
export function getOpenMembers(app: App, cluster: TabCandyCluster): Map<string, WorkspaceLeaf[]> {
	const members = new Set(cluster.members);
	const open = new Map<string, WorkspaceLeaf[]>();
	app.workspace.iterateRootLeaves((leaf) => {
		const path = getTabPath(leaf);
		if (path !== null && members.has(path)) {
			open.set(
				path,
				[
					...open.get(path) ?? [],
					leaf
				]
			);
		}
	});
	return open;
}

/**
 * Opens a Cluster: places its members, makes the first open member the active tab and bumps `lastTouchedAt`. With `keepPairedClustersInSync` on, does the same to its paired Cluster.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 */
export async function openCluster(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string
): Promise<void> {
	const {
		clusters,
		keepPairedClustersInSync
	} = settingsStore.get();
	const cluster = clusters[clusterId];
	if (cluster === undefined) {
		return;
	}

	await openOne(
		app,
		settingsStore,
		clusterId
	);
	if (keepPairedClustersInSync && cluster.pairedWith !== null) {
		await openOne(
			app,
			settingsStore,
			cluster.pairedWith
		);
	}
}

/**
 * Opens a Cluster without mirroring: places its members, makes the first open member in `members` order the active tab, bumps `lastTouchedAt` and shows a notice.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 */
async function openOne(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string
): Promise<void> {
	const {
		clusters,
		jumpToExistingCluster
	} = settingsStore.get();
	const cluster = clusters[clusterId];
	if (cluster === undefined) {
		return;
	}

	const present = cluster.members.filter((path) => app.vault.getAbstractFileByPath(path) instanceof TFile);
	const missing = cluster.members.length - present.length;
	const alreadyOpen = getOpenMembers(
		app,
		cluster
	);
	const toOpen = present.filter((path) => !(jumpToExistingCluster && alreadyOpen.has(path)));

	await placeMembers(
		app,
		cluster,
		toOpen
	);

	const nowOpen = getOpenMembers(
		app,
		cluster
	);
	const first = cluster.members.find((path) => nowOpen.has(path));
	const firstLeaf = first === undefined ? undefined : nowOpen.get(first)?.[0];
	if (firstLeaf !== undefined) {
		app.workspace.setActiveLeaf(
			firstLeaf,
			{ focus: true }
		);
	}

	await settingsStore.update({ clusters: touchCluster(
		settingsStore.get().clusters,
		clusterId
	) });

	const openedText = `Opened ${ toOpen.length } ${ toOpen.length === 1 ? 'tab' : 'tabs' }.`;
	new Notice(missing === 0 ? openedText : `${ openedText } ${ missing } missing skipped.`);
}

/**
 * Opens a file in a leaf without activating it.
 *
 * @param leaf - The leaf.
 * @param app - The Obsidian app.
 * @param path - Vault-relative path of the file.
 */
async function openPath(
	leaf: WorkspaceLeaf,
	app: App,
	path: string
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) {
		await leaf.openFile(
			file,
			{ active: false }
		);
	}
}

/**
 * Opens each path as a new tab: after `after` when given, otherwise in the active pane.
 *
 * @param app - The Obsidian app.
 * @param after - A leaf in the pane to add the tabs to, or null for the active pane.
 * @param paths - Paths to open.
 */
async function placeAsTabs(
	app: App,
	after: WorkspaceLeaf | null,
	paths: string[]
): Promise<void> {
	if (after !== null && paths.length > 0) {
		app.workspace.setActiveLeaf(
			after,
			{ focus: false }
		);
	}
	for (const path of paths) {
		await openPath(
			app.workspace.getLeaf('tab'),
			app,
			path
		);
	}
}

/**
 * Places members: by the stored layout when the Cluster has one, otherwise as new tabs in the active pane. Members the layout doesn't hold are appended as new tabs to the last restored group. When the restore fails, falls back to a flat arrangement, then to new tabs in the active pane.
 *
 * @param app - The Obsidian app.
 * @param cluster - The Cluster.
 * @param paths - Paths to place, in `members` order.
 */
async function placeMembers(
	app: App,
	cluster: TabCandyCluster,
	paths: string[]
): Promise<void> {
	if (paths.length === 0) {
		return;
	}

	const plan = cluster.layoutSnapshot === undefined
		? null
		: planRestore(
			cluster.layoutSnapshot,
			new Set(paths)
		);
	if (plan === null) {
		await placeAsTabs(
			app,
			null,
			paths
		);
		return;
	}

	for (const attempt of [
		plan,
		flattenPlan(plan)
	]) {
		const created: WorkspaceLeaf[] = [];
		try {
			const last = await placePlan(
				app,
				attempt,
				app.workspace.getLeaf('tab'),
				created
			);
			const placed = new Set(getPlanPaths(attempt));
			await placeAsTabs(
				app,
				last,
				paths.filter((path) => !placed.has(path))
			);
			return;
		} catch {
			for (const leaf of created) {
				leaf.detach();
			}
		}
	}

	await placeAsTabs(
		app,
		null,
		paths
	);
}

/**
 * Walks a plan depth first. A tab group puts its first path in the anchor and the rest in new tabs after it. A split restores its first child in the anchor and every later child in a new anchor split off the previous one.
 *
 * @param app - The Obsidian app.
 * @param plan - The plan.
 * @param anchor - The leaf the plan starts in.
 * @param created - Collects each leaf created by a split, so a failed restore can discard them.
 * @returns The last leaf of the last tab group.
 * @throws When a split yields no leaf.
 */
async function placePlan(
	app: App,
	plan: RestorePlan,
	anchor: WorkspaceLeaf,
	created: WorkspaceLeaf[]
): Promise<WorkspaceLeaf> {
	if (!created.includes(anchor)) {
		created.push(anchor);
	}
	if (plan.kind === 'tabs') {
		let last = anchor;
		for (const [
			index,
			path
		] of plan.paths.entries()) {
			if (index > 0) {
				app.workspace.setActiveLeaf(
					last,
					{ focus: false }
				);
				last = app.workspace.getLeaf('tab');
				created.push(last);
			}
			await openPath(
				last,
				app,
				path
			);
		}
		return last;
	}

	let previous = anchor;
	let last = anchor;
	for (const [
		index,
		child
	] of plan.children.entries()) {
		let childAnchor = previous;
		if (index > 0) {
			// Typed by Obsidian as always returning a leaf; a failed split returns nothing at runtime.
			const split = app.workspace.createLeafBySplit(
				previous,
				plan.direction
			) as WorkspaceLeaf | undefined;
			if (split === undefined) {
				throw new Error('Could not split the layout.');
			}
			childAnchor = split;
		}
		last = await placePlan(
			app,
			child,
			childAnchor,
			created
		);
		previous = childAnchor;
	}
	return last;
}