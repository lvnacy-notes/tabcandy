/** @file Opens and reveals the Cluster sidebar. */
import { App } from 'obsidian';
import { CLUSTER_SIDEBAR_VIEW_TYPE } from '../types';

/**
 * Reveals the open Cluster sidebar when there is one. Otherwise opens it in the right dock.
 *
 * @param app - The Obsidian app.
 */
export async function activateClusterSidebar(app: App): Promise<void> {
	const { workspace } = app;
	const existing = workspace.getLeavesOfType(CLUSTER_SIDEBAR_VIEW_TYPE)[0];
	if (existing) {
		await workspace.revealLeaf(existing);
		return;
	}

	const leaf = workspace.getRightLeaf(false);
	if (!leaf) {
		return;
	}

	await leaf.setViewState({
		type: CLUSTER_SIDEBAR_VIEW_TYPE,
		active: true,
	});
	await workspace.revealLeaf(leaf);
}