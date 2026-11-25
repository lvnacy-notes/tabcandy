/** @file Actions on a tab. Each definition drives both its command and its tab-header menu item. */
import type {
	Command,
	WorkspaceLeaf
} from 'obsidian';
import {
	addToMostRecentCluster,
	promptAndAdd,
	promptAndRemove
} from './clusterMembership';
import { promptAndCreate } from './clusterManagement';
import {
	getClustersContainingPath,
	getMostRecentCluster
} from './clusters';
import {
	getPanePaths,
	getTabPath
} from '../tabs/tabPaths';
import type { CommandDependencies } from '../types';

/** An action on a tab. */
export interface TabAction {
	/** Command id. */
	id: string;
	/** Command name. */
	commandName: string;
	/** Icon of the menu item. */
	icon: string;
	/** Whether the action applies to the tab. */
	isAvailable: (
		leaf: WorkspaceLeaf, 
		dependencies: CommandDependencies
	) => boolean;
	/** Menu title when it differs from the command name. Null hides the menu item. */
	menuTitle?: (
		leaf: WorkspaceLeaf, 
		dependencies: CommandDependencies
	) => string | null;
	/** Runs the action on the tab. */
	run: (
		leaf: WorkspaceLeaf, 
		dependencies: CommandDependencies
	) => void;
}

export const ADD_TO_CLUSTER: TabAction = {
	id: 'add-to-cluster',
	commandName: 'Add to cluster',
	icon: 'layers',
	isAvailable: whenFileBacked((
		_path, 
		dependencies
	) => hasClusters(dependencies)),
	run: onPath((path, dependencies) => {
		promptAndAdd(
			dependencies.settingsStore,
			dependencies.promptForClusterChoice,
			path
		);
	}),
};

export const ADD_TO_MOST_RECENT_CLUSTER: TabAction = {
	id: 'add-to-most-recent-cluster',
	commandName: 'Add to most recent cluster',
	icon: 'layers',
	isAvailable: whenFileBacked((
		_path, 
		dependencies
	) => hasClusters(dependencies)),
	menuTitle: (leaf, dependencies) => {
		const path = getTabPath(leaf);
		const mostRecent = getMostRecentCluster(dependencies.settingsStore.get().clusters);
		return path === null || mostRecent === null || mostRecent.members.includes(path) ? null : `Add to ${ mostRecent.name }`;
	},
	run: onPath((path, dependencies) => {
		addToMostRecentCluster(
			dependencies.settingsStore,
			path
		);
	}),
};

export const CREATE_CLUSTER_FROM_ACTIVE_PANE: TabAction = {
	id: 'create-cluster-from-active-pane',
	commandName: 'Create cluster from active pane',
	icon: 'layers',
	isAvailable: (leaf, dependencies) => getPanePaths(
		dependencies.app,
		leaf
	).length > 0,
	menuTitle: () => 'Create cluster from pane',
	run: (leaf, dependencies) => {
		promptAndCreate(
			dependencies.settingsStore,
			dependencies.promptForCluster,
			getPanePaths(
				dependencies.app,
				leaf
			)
		);
	},
};

export const CREATE_CLUSTER_FROM_ACTIVE_TAB: TabAction = {
	id: 'create-cluster-from-active-tab',
	commandName: 'Create cluster from active tab',
	icon: 'layers',
	isAvailable: whenFileBacked(),
	menuTitle: () => 'Create cluster from tab',
	run: onPath((path, dependencies) => {
		promptAndCreate(
			dependencies.settingsStore,
			dependencies.promptForCluster,
			[path]
		);
	}),
};

export const REMOVE_FROM_CLUSTER: TabAction = {
	id: 'remove-from-cluster',
	commandName: 'Remove from cluster',
	icon: 'layers',
	isAvailable: whenFileBacked((path, dependencies) => getClustersContainingPath(
		dependencies.settingsStore.get().clusters,
		path
	).length > 0),
	run: onPath((path, dependencies) => {
		promptAndRemove(
			dependencies.settingsStore,
			dependencies.promptForClusterRemoval,
			path
		);
	}),
};

export const SET_READING_COMPANION: TabAction = {
	id: 'set-reading-companion',
	commandName: 'Set reading companion',
	icon: 'book-open',
	isAvailable: (
		leaf, 
		dependencies
	) => dependencies.readingCompanion.canSet(leaf),
	run: (leaf, dependencies) => {
		dependencies.readingCompanion.promptAndSet(
			dependencies.promptForClusterChoice,
			leaf
		);
	},
};

/** Every tab action, in tab-header menu order. */
export const TAB_ACTIONS: TabAction[] = [
	CREATE_CLUSTER_FROM_ACTIVE_TAB,
	CREATE_CLUSTER_FROM_ACTIVE_PANE,
	ADD_TO_CLUSTER,
	ADD_TO_MOST_RECENT_CLUSTER,
	REMOVE_FROM_CLUSTER,
	SET_READING_COMPANION,
];

/**
 * Builds the command for a tab action. It acts on the most recent tab and is available while the action applies to it.
 *
 * @param dependencies - What the action needs from the plugin.
 * @param action - The action.
 * @returns The command.
 */
export function buildTabActionCommand(dependencies: CommandDependencies, action: TabAction): Command {
	return {
		id: action.id,
		name: action.commandName,
		checkCallback: (checking) => {
			const leaf = dependencies.app.workspace.getMostRecentLeaf();
			if (leaf === null || !action.isAvailable(
				leaf,
				dependencies
			)) {
				return false;
			}
			if (!checking) {
				action.run(
					leaf,
					dependencies
				);
			}
			return true;
		},
	};
}

/**
 * Gets the title a tab-header menu shows for an action.
 *
 * @param action - The action.
 * @param leaf - The tab the menu belongs to.
 * @param dependencies - What the action needs from the plugin.
 * @returns The title, or null when the menu should not show the action.
 */
export function getMenuTitle(
	action: TabAction,
	leaf: WorkspaceLeaf,
	dependencies: CommandDependencies
): string | null {
	if (!action.isAvailable(
		leaf,
		dependencies
	)) {
		return null;
	}
	return action.menuTitle === undefined ? action.commandName : action.menuTitle(
		leaf,
		dependencies
	);
}

/**
 * Whether any Cluster exists.
 *
 * @param dependencies - What the action needs from the plugin.
 * @returns True when one does.
 */
function hasClusters(dependencies: CommandDependencies): boolean {
	return Object.keys(dependencies.settingsStore.get().clusters).length > 0;
}

/**
 * Builds a runner for an action on a file-backed tab. Does nothing for any other tab.
 *
 * @param run - Runs the action on the tab's file path.
 * @returns The runner.
 */
function onPath(run: (
	path: string, 
	dependencies: CommandDependencies
) => void): TabAction['run'] {
	return (leaf, dependencies) => {
		const path = getTabPath(leaf);
		if (path !== null) {
			run(
				path,
				dependencies
			);
		}
	};
}

/**
 * Builds an availability check that needs a file-backed tab.
 *
 * @param check - Further condition on the tab's file path.
 * @returns The check.
 */
function whenFileBacked(check: (
	path: string, 
	dependencies: CommandDependencies
) => boolean = () => true): TabAction['isAvailable'] {
	return (leaf, dependencies) => {
		const path = getTabPath(leaf);
		return path !== null && check(
			path,
			dependencies
		);
	};
}
