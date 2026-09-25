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

/**
 * A workspace that distinguishes root leaves (tabs) from sidebar leaves,
 * and whose "most recently used leaf" can be set directly, rather than
 * always being whichever leaf was created last.
 */
export default class FakeWorkspace extends WorkspaceMock {
	private readonly appRef: AppMock;
	private readonly rootLeaves: WorkspaceLeafMock[] = [];
	private readonly sidebarLeaves = new Set<WorkspaceLeafMock>();
	private mostRecentLeafOverride: WorkspaceLeafMock | null | undefined = undefined;

	constructor(app: AppMock, containerEl: HTMLElement) {
		super(app, containerEl);
		this.appRef = app;
	}

	addRootLeaf(leaf: WorkspaceLeafMock): void {
		this.rootLeaves.push(leaf);
	}

	addSidebarLeaf(leaf: WorkspaceLeafMock): void {
		this.sidebarLeaves.add(leaf);
	}

	/**
	 * Fixes what getMostRecentLeaf() returns until this is called again.
	 * Leaving it unset returns null.
	 */
	setMostRecentLeaf(leaf: WorkspaceLeafMock | null): void {
		this.mostRecentLeafOverride = leaf;
	}

	override iterateRootLeaves(callback: (leaf: WorkspaceLeafMock) => unknown): void {
		for (const leaf of this.rootLeaves) {
			callback(leaf);
		}
	}

	override iterateAllLeaves(callback: (leaf: WorkspaceLeafMock) => unknown): void {
		for (const leaf of [...this.rootLeaves, ...this.sidebarLeaves]) {
			callback(leaf);
		}
	}

	override getMostRecentLeaf(root?: WorkspaceParent): WorkspaceLeafMock | null {
		if (this.mostRecentLeafOverride !== undefined) {
			return this.mostRecentLeafOverride;
		}
		return super.getMostRecentLeaf(root);
	}

	override removeLeaf__(leaf: WorkspaceLeafMock): void {
		const index = this.rootLeaves.indexOf(leaf);
		if (index !== -1) {
			this.rootLeaves.splice(index, 1);
		}
		this.sidebarLeaves.delete(leaf);
	}

	/**
	 * Always creates and returns a new root leaf, ignoring `newLeaf` -
	 * nothing in this codebase calls this with anything but `'tab'`.
	 */
	override getLeaf(_newLeaf?: boolean | PaneType): WorkspaceLeafMock {
		const leaf = new FakeWorkspaceLeaf(this.appRef);
		this.rootLeaves.push(leaf);
		return leaf;
	}
}

/**
 * Builds an app whose workspace is a FakeWorkspace.
 */
export function createFakeWorkspaceApp(
	options: Parameters<typeof AppMock.createConfigured__>[0] = {}
): App {
	const app = AppMock.createConfigured__(options);
	app.workspace = new FakeWorkspace(app, createDiv());
	return app.asOriginalType__();
}

/**
 * Adds a leaf to the workspace's root split (a tab).
 */
export function addRootLeaf(app: App, leaf: WorkspaceLeaf): void {
	(app.workspace as unknown as FakeWorkspace).addRootLeaf(
		leaf as unknown as WorkspaceLeafMock
	);
}

/**
 * Adds a leaf to a sidebar rather than the root split.
 */
export function addSidebarLeaf(app: App, leaf: WorkspaceLeaf): void {
	(app.workspace as unknown as FakeWorkspace).addSidebarLeaf(
		leaf as unknown as WorkspaceLeafMock
	);
}

/**
 * Fixes what the workspace's getMostRecentLeaf() returns.
 */
export function setMostRecentLeaf(app: App, leaf: WorkspaceLeaf | null): void {
	(app.workspace as unknown as FakeWorkspace).setMostRecentLeaf(
		leaf as unknown as WorkspaceLeafMock | null
	);
}

/**
 * Marks the workspace's layout as ready, running any onLayoutReady()
 * callbacks that were waiting on it.
 */
export function setLayoutReady(app: App): void {
	(app.workspace as unknown as { setLayoutReady__: () => void }).setLayoutReady__();
}