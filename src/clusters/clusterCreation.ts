import {
	App,
	Command,
	EventRef,
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

/** `source` Obsidian passes to `file-menu` for a tab header's context menu. */
const TAB_HEADER_SOURCE = 'tab-header';

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
 * @returns The file paths, in tab order. Empty when the leaf isn't a root leaf.
 */
export function getPanePaths(app: App, leaf: WorkspaceLeaf): string[] {
	const paths: string[] = [];
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
function promptAndCreate(
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
 * Registers the commands that create a Cluster: empty, from the active tab,
 * and from the active pane. The latter two are available only when the most
 * recent tab, or its pane, has file-backed tabs.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param addCommand - Registers a command with the plugin.
 * @param prompt - Collects the Cluster details.
 */
export function registerClusterCreationCommands(
	app: App,
	settingsStore: SettingsStore,
	addCommand: (command: Command) => Command,
	prompt: PromptForCluster
): void {
	addCommand({
		id: 'create-cluster',
		name: 'Create cluster',
		callback: () => {
			promptAndCreate(
				settingsStore,
				prompt,
				[]
			);
		},
	});

	addCommand({
		id: 'create-cluster-from-active-tab',
		name: 'Create cluster from active tab',
		checkCallback: (checking) => {
			const leaf = app.workspace.getMostRecentLeaf();
			const path = leaf === null ? null : getTabPath(leaf);
			if (path === null) {
				return false;
			}
			if (!checking) {
				promptAndCreate(
					settingsStore,
					prompt,
					[path]
				);
			}
			return true;
		},
	});

	addCommand({
		id: 'create-cluster-from-active-pane',
		name: 'Create cluster from active pane',
		checkCallback: (checking) => {
			const leaf = app.workspace.getMostRecentLeaf();
			const paths = leaf === null ? [] : getPanePaths(app, leaf);
			if (paths.length === 0) {
				return false;
			}
			if (!checking) {
				promptAndCreate(
					settingsStore,
					prompt,
					paths
				);
			}
			return true;
		},
	});
}

/**
 * Adds "Create Cluster from tab" and "Create Cluster from pane" to a tab
 * header's context menu. Each item appears only when the tab, or its pane,
 * has file-backed tabs.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param registerEvent - Registers the listener with the owning component.
 * @param prompt - Collects the Cluster details.
 */
export function registerClusterCreationMenu(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void,
	prompt: PromptForCluster
): void {
	registerEvent(
		app.workspace.on('file-menu', (menu, _file, source, leaf) => {
			if (source !== TAB_HEADER_SOURCE || leaf === undefined) {
				return;
			}

			const tabPath = getTabPath(leaf);
			if (tabPath !== null) {
				menu.addItem((item) => {
					item
						.setTitle('Create cluster from tab')
						.setIcon('layers')
						.onClick(() => {
							promptAndCreate(
								settingsStore,
								prompt,
								[tabPath]
							);
						});
				});
			}

			const panePaths = getPanePaths(app, leaf);
			if (panePaths.length > 0) {
				menu.addItem((item) => {
					item
						.setTitle('Create cluster from pane')
						.setIcon('layers')
						.onClick(() => {
							promptAndCreate(
								settingsStore,
								prompt,
								panePaths
							);
						});
				});
			}
		})
	);
}