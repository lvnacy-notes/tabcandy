/** @file Finds and opens Tray leaves. */
import { App, WorkspaceLeaf } from 'obsidian';
import { touchCluster } from '../clusters/clusters';
import SettingsStore from '../settings/SettingsStore';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

/**
 * Reads the id of the Cluster a Tray leaf shows.
 *
 * @param leaf - A Tray leaf.
 * @returns The Cluster id, or null when the leaf's state has none.
 */
export function getTrayClusterId(leaf: WorkspaceLeaf): string | null {
	const { state } = leaf.getViewState();
	if (typeof state === 'object' && state !== null && 'clusterId' in state && typeof state.clusterId === 'string') {
		return state.clusterId;
	}
	return null;
}

/**
 * Opens a Tray for a Cluster and sets the Cluster's `lastTouchedAt`. With
 * `jumpToExistingCluster` on, an already open Tray for the Cluster is
 * revealed instead. Does nothing when the Cluster doesn't exist.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param leaf - The leaf to open the Tray in. Defaults to a new tab in the active pane.
 */
export async function openClusterTray(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string,
	leaf?: WorkspaceLeaf
): Promise<void> {
	const { clusters, jumpToExistingCluster } = settingsStore.get();
	if (clusters[clusterId] === undefined) {
		return;
	}

	const existing = jumpToExistingCluster
		? app.workspace
			.getLeavesOfType(CLUSTER_TRAY_VIEW_TYPE)
			.find((candidate) => getTrayClusterId(candidate) === clusterId)
		: undefined;

	if (existing) {
		await app.workspace.revealLeaf(existing);
	} else {
		const target = leaf ?? app.workspace.getLeaf('tab');
		await target.setViewState({
			type: CLUSTER_TRAY_VIEW_TYPE,
			active: true,
			state: { clusterId },
		});
	}

	await settingsStore.update({ clusters: touchCluster(settingsStore.get().clusters, clusterId) });
}

/**
 * Opens a Tray as a new tab in the pane under a dropped Cluster heading. Does nothing when the drop landed outside every pane, such as on a sidebar.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @param target - The element under the pointer when the drag ended.
 */
export async function openClusterTrayAt(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string,
	target: Element | null
): Promise<void> {
	if (target === null) {
		return;
	}

	const panes: WorkspaceLeaf[] = [];
	app.workspace.iterateRootLeaves((leaf) => {
		if (leaf.view.containerEl.contains(target)) {
			panes.push(leaf);
		}
	});
	const [pane] = panes;
	if (!pane) {
		return;
	}

	app.workspace.setActiveLeaf(pane, { focus: true });
	await openClusterTray(
		app,
		settingsStore,
		clusterId
	);
}