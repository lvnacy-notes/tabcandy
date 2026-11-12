import { App, WorkspaceLeaf } from 'obsidian';

/**
 * Collects the root leaves of a workspace.
 *
 * @param app - The fake app.
 * @returns The root leaves, in workspace order.
 */
export function collectRootLeaves(app: App): WorkspaceLeaf[] {
	const leaves: WorkspaceLeaf[] = [];
	app.workspace.iterateRootLeaves((leaf) => {
		leaves.push(leaf);
	});
	return leaves;
}