/** @file Reading the file paths of tabs and panes. */
import {
	App,
	WorkspaceLeaf
} from 'obsidian';
import { getViewStateFilePath } from './tabNavigation';

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
