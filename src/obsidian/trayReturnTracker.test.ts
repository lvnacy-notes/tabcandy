/** @file Tests for putting a Tray back when the member opened from it is closed. */
import {
	TFile,
	WorkspaceLeaf
} from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import TrayReturnTracker from './TrayReturnTracker';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import { createFakeWorkspaceApp, setLayoutReady } from '../test/FakeWorkspace';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

interface StubLeaf {
	getViewState: () => { type: string; state: Record<string, unknown> };
	openFile: ReturnType<typeof vi.fn>;
	parent: object;
	setViewState: ReturnType<typeof vi.fn>;
}

/**
 * Builds a stand-in leaf.
 *
 * @param parent - The leaf's parent.
 * @param type - The view type the leaf reports.
 * @returns The leaf.
 */
function buildLeaf(parent: object, type = 'markdown'): StubLeaf {
	return {
		getViewState: () => ({ type, state: {} }),
		openFile: vi.fn().mockResolvedValue(undefined),
		parent,
		setViewState: vi.fn().mockResolvedValue(undefined),
	};
}

/**
 * Builds a tracker over a workspace whose leaves the test controls.
 *
 * @param leaves - The leaves in the workspace. The test may change the array.
 * @param clusterId - Id of the Cluster the Tray shows, or null for no Clusters.
 * @returns The tracker and the workspace spies.
 */
function buildTracker(leaves: StubLeaf[], clusterId: string | null = 'one') {
	const app = createFakeWorkspaceApp({ files: { 'a.md': '' } });
	setLayoutReady(app);
	vi.spyOn(app.workspace, 'iterateAllLeaves').mockImplementation((callback) => {
		for (const leaf of leaves) {
			callback(leaf as unknown as WorkspaceLeaf);
		}
	});
	const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf').mockImplementation(() => {});
	const getLeaf = vi.spyOn(app.workspace, 'getLeaf');
	const store = clusterId === null ? buildStoreWith() : buildStoreWith(buildCluster({ id: clusterId }));
	const file = app.vault.getAbstractFileByPath('a.md');
	if (clusterId !== null && !(file instanceof TFile)) {
		throw new Error('Expected a.md in the fake vault');
	}

	return {
		getLeaf,
		setActiveLeaf,
		tracker: new TrayReturnTracker(app, store),
	};
}

/**
 * Removes a leaf from a list, as closing its tab does.
 *
 * @param leaves - The workspace's leaves.
 * @param leaf - The leaf to remove.
 */
function close(leaves: StubLeaf[], leaf: StubLeaf): void {
	leaves.splice(leaves.indexOf(leaf), 1);
}

describe('TrayReturnTracker', () => {
	it('opens a member in the Tray\'s own leaf', async () => {
		const parent = {};
		const tray = buildLeaf(parent);
		const { tracker } = buildTracker([tray]);

		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'a.md'
		);

		expect(tray.openFile).toHaveBeenCalledWith(expect.any(TFile));
	});

	it('leaves the Tray alone when the member file is missing', async () => {
		const tray = buildLeaf({});
		const { tracker } = buildTracker([tray]);

		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'gone.md'
		);

		expect(tray.openFile).not.toHaveBeenCalled();
	});

	it('opens a new Tray beside the tab before the slot once the member\'s tab is closed', async () => {
		const parent = {};
		const before = buildLeaf(parent);
		const tray = buildLeaf(parent);
		const after = buildLeaf(parent);
		const leaves = [before, tray, after];
		const newTab = buildLeaf(parent, 'empty');
		const { tracker, getLeaf, setActiveLeaf } = buildTracker(leaves);
		getLeaf.mockReturnValue(newTab as unknown as WorkspaceLeaf);
		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'a.md'
		);

		close(leaves, tray);
		await tracker.handleLayoutChange();

		expect(setActiveLeaf).toHaveBeenCalledWith(before, { focus: false });
		expect(newTab.setViewState).toHaveBeenCalledWith({
			type: CLUSTER_TRAY_VIEW_TYPE,
			active: true,
			state: { clusterId: 'one' },
		});
	});

	it('reuses the empty leaf Obsidian leaves behind when the last tab of a group is closed', async () => {
		const parent = {};
		const tray = buildLeaf(parent);
		const leaves = [tray];
		const { tracker, getLeaf } = buildTracker(leaves);
		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'a.md'
		);
		const empty = buildLeaf(parent, 'empty');

		close(leaves, tray);
		leaves.push(empty);
		await tracker.handleLayoutChange();

		expect(empty.setViewState).toHaveBeenCalledTimes(1);
		expect(getLeaf).not.toHaveBeenCalled();
	});

	it('does nothing while the member\'s tab is still open', async () => {
		const tray = buildLeaf({});
		const { tracker, getLeaf } = buildTracker([tray]);
		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'a.md'
		);

		await tracker.handleLayoutChange();

		expect(getLeaf).not.toHaveBeenCalled();
		expect(tray.setViewState).not.toHaveBeenCalled();
	});

	it('does not bring the Tray back for a Cluster that was deleted', async () => {
		const parent = {};
		const tray = buildLeaf(parent);
		const leaves = [tray];
		const empty = buildLeaf(parent, 'empty');
		const { tracker } = buildTracker(leaves, null);
		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'a.md'
		);

		close(leaves, tray);
		leaves.push(empty);
		await tracker.handleLayoutChange();

		expect(empty.setViewState).not.toHaveBeenCalled();
	});

	it('brings the Tray back only once', async () => {
		const parent = {};
		const tray = buildLeaf(parent);
		const leaves = [tray];
		const empty = buildLeaf(parent, 'empty');
		const { tracker } = buildTracker(leaves);
		await tracker.openMember(
			tray as unknown as WorkspaceLeaf,
			'one',
			'a.md'
		);

		close(leaves, tray);
		leaves.push(empty);
		await tracker.handleLayoutChange();
		await tracker.handleLayoutChange();

		expect(empty.setViewState).toHaveBeenCalledTimes(1);
	});
});