/** @file A fake workspace for tests. */
import {
	App,
	PaneType,
	WorkspaceLeaf,
	WorkspaceParent
} from 'obsidian';
import {
	App as AppMock,
	Workspace as WorkspaceMock,
	WorkspaceLeaf as WorkspaceLeafMock,
} from 'obsidian-test-mocks/obsidian';
import FakeWorkspaceLeaf from './FakeWorkspaceLeaf';

/** A workspace that separates root leaves from sidebar leaves and lets a test set the most recent leaf directly. */
export default class FakeWorkspace extends WorkspaceMock {
	private readonly appRef: AppMock;
	private readonly rootLeaves: WorkspaceLeafMock[] = [];
	private readonly sidebarLeaves = new Set<WorkspaceLeafMock>();
	private mostRecentLeafOverride: WorkspaceLeafMock | null | undefined = undefined;

	/**
	 * @param app - The mock app.
	 * @param containerEl - The workspace's container element.
	 */
	constructor(app: AppMock, containerEl: HTMLElement) {
		super(app, containerEl);
		this.appRef = app;
	}

	/**
	 * Adds a root leaf.
	 *
	 * @param leaf - The leaf.
	 */
	addRootLeaf(leaf: WorkspaceLeafMock): void {
		this.rootLeaves.push(leaf);
	}

	/**
	 * Adds a sidebar leaf.
	 *
	 * @param leaf - The leaf.
	 */
	addSidebarLeaf(leaf: WorkspaceLeafMock): void {
		this.sidebarLeaves.add(leaf);
	}

	/**
	 * Fixes what `getMostRecentLeaf()` returns. Until called, it returns null.
	 *
	 * @param leaf - The leaf, or null.
	 */
	setMostRecentLeaf(leaf: WorkspaceLeafMock | null): void {
		this.mostRecentLeafOverride = leaf;
	}

	/**
	 * Calls `callback` with each root leaf.
	 *
	 * @param callback - Called with each leaf.
	 */
	override iterateRootLeaves(callback: (leaf: WorkspaceLeafMock) => unknown): void {
		for (const leaf of this.rootLeaves) {
			callback(leaf);
		}
	}

	/**
	 * Calls `callback` with each root leaf, then each sidebar leaf.
	 *
	 * @param callback - Called with each leaf.
	 */
	override iterateAllLeaves(callback: (leaf: WorkspaceLeafMock) => unknown): void {
		for (const leaf of [...this.rootLeaves, ...this.sidebarLeaves]) {
			callback(leaf);
		}
	}

	/**
	 * Returns the leaf fixed by `setMostRecentLeaf()`, or the mock's most recent leaf when none was fixed.
	 *
	 * @param root - The root to look in.
	 * @returns The leaf, or null.
	 */
	override getMostRecentLeaf(root?: WorkspaceParent): WorkspaceLeafMock | null {
		if (this.mostRecentLeafOverride !== undefined) {
			return this.mostRecentLeafOverride;
		}
		return super.getMostRecentLeaf(root);
	}

	/**
	 * Removes a leaf from the root and sidebar leaves.
	 *
	 * @param leaf - The leaf.
	 */
	override removeLeaf__(leaf: WorkspaceLeafMock): void {
		const index = this.rootLeaves.indexOf(leaf);
		if (index !== -1) {
			this.rootLeaves.splice(index, 1);
		}
		this.sidebarLeaves.delete(leaf);
	}

	/**
	 * Creates a root leaf and returns it, whatever `_newLeaf` is.
	 *
	 * @param _newLeaf - Ignored.
	 * @returns The new leaf.
	 */
	override getLeaf(_newLeaf?: boolean | PaneType): WorkspaceLeafMock {
		const leaf = new FakeWorkspaceLeaf(this.appRef);
		this.rootLeaves.push(leaf);
		return leaf;
	}
}

/**
 * Builds an app whose workspace is a `FakeWorkspace`.
 *
 * @param options - Options for the mock app.
 * @returns The app.
 */
export function createFakeWorkspaceApp(
	options: Parameters<typeof AppMock.createConfigured__>[0] = {}
): App {
	const app = AppMock.createConfigured__(options);
	app.workspace = new FakeWorkspace(app, createDiv());
	return app.asOriginalType__();
}

/**
 * Adds a leaf to the workspace's root leaves.
 *
 * @param app - The app from `createFakeWorkspaceApp()`.
 * @param leaf - The leaf.
 */
export function addRootLeaf(app: App, leaf: WorkspaceLeaf): void {
	(app.workspace as unknown as FakeWorkspace).addRootLeaf(
		leaf as unknown as WorkspaceLeafMock
	);
}

/**
 * Adds a leaf to the workspace's sidebar leaves.
 *
 * @param app - The app from `createFakeWorkspaceApp()`.
 * @param leaf - The leaf.
 */
export function addSidebarLeaf(app: App, leaf: WorkspaceLeaf): void {
	(app.workspace as unknown as FakeWorkspace).addSidebarLeaf(
		leaf as unknown as WorkspaceLeafMock
	);
}

/**
 * Fixes what the workspace's `getMostRecentLeaf()` returns.
 *
 * @param app - The app from `createFakeWorkspaceApp()`.
 * @param leaf - The leaf, or null.
 */
export function setMostRecentLeaf(app: App, leaf: WorkspaceLeaf | null): void {
	(app.workspace as unknown as FakeWorkspace).setMostRecentLeaf(
		leaf as unknown as WorkspaceLeafMock | null
	);
}

/**
 * Marks the workspace's layout as ready and runs the waiting `onLayoutReady()` callbacks.
 *
 * @param app - The app.
 */
export function setLayoutReady(app: App): void {
	(app.workspace as unknown as { setLayoutReady__: () => void }).setLayoutReady__();
}