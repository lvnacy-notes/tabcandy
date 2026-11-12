import {
	App,
	Notice,
	WorkspaceLeaf
} from 'obsidian';
import { createCluster } from './clusters';
import { getViewStateFilePath } from '../tabs/tabNavigation';
import SettingsStore from '../settings/SettingsStore';
import type {
	ClusterDraft,
	PromptForCluster,
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
 * Collects the file paths of every file-backed tab in a leaf's pane.
 *
 * @param app - The Obsidian app.
 * @param leaf - A leaf in the pane.
 * @returns The file paths, in tab order. Empty when the leaf isn't a root leaf or has no pane.
 */
export function getPanePaths(app: App, leaf: WorkspaceLeaf): string[] {
	const paths: string[] = [];
	if (!leaf.parent) {
		return paths;
	}
	app.workspace.iterateRootLeaves((candidate) => {
		if (candidate.parent !== leaf.parent) {
			return;
		}
		const path = getTabPath(candidate);
		if (path !== null) {
			paths.push(path);
		}
	});
	return paths;
}

/**
 * Reads a leaf's file path.
 *
 * @param leaf - The leaf.
 * @returns The file path, or null when the leaf has none or its state can't be read.
 */
export function getTabPath(leaf: WorkspaceLeaf): string | null {
	try {
		return getViewStateFilePath(leaf.getViewState());
	} catch {
		return null;
	}
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