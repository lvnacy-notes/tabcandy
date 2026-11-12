/** @file Tests for Cluster creation: leaf path reading and the draft-to-Cluster flow. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	createClusterFromDraft,
	describeNewCluster,
	getPanePaths,
	getTabPath
} from './clusterCreation';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	createFakeLeaf,
	makeUnreadable
} from '../test/FakeWorkspaceLeaf';
import {
	addFileTab,
	addNonFileTab,
	buildStore
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildClusters,
	buildSettings
} from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';
import { UNTITLED_CLUSTER_NAME } from '../types';

describe('getTabPath', () => {
	it('returns the file path of a file-backed leaf', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'Notes/a.md', {});

		const result = getTabPath(leaf);

		expect(result).toBe('Notes/a.md');
	});

	it('returns null for a leaf with no file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(app, {});

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});

	it('returns null for an empty leaf', () => {
		const app = createFakeWorkspaceApp();
		const leaf = createFakeLeaf(app);

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});

	it('returns null for a leaf whose state cannot be read', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		makeUnreadable(leaf);

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});
});

describe('getPanePaths', () => {
	it('returns the file paths of every tab in the leaf\'s pane, in tab order', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'one.md', pane);
		const second = await addFileTab(app, 'two.md', pane);
		await addFileTab(app, 'three.md', pane);

		const result = getPanePaths(app, second);

		expect(result).toEqual(['one.md', 'two.md', 'three.md']);
	});

	it('excludes tabs in other panes', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const mine = await addFileTab(app, 'mine.md', pane);
		await addFileTab(app, 'other.md', {});

		const result = getPanePaths(app, mine);

		expect(result).toEqual(['mine.md']);
	});

	it('excludes tabs in the pane that have no file', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const file = await addFileTab(app, 'a.md', pane);
		await addNonFileTab(app, pane);

		const result = getPanePaths(app, file);

		expect(result).toEqual(['a.md']);
	});

	it('excludes tabs in the pane whose state cannot be read', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const readable = await addFileTab(app, 'a.md', pane);
		const unreadable = await addFileTab(app, 'b.md', pane);
		makeUnreadable(unreadable);

		const result = getPanePaths(app, readable);

		expect(result).toEqual(['a.md']);
	});

	it('returns an empty array for a leaf that is not a root leaf', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(app, 'a.md', {});
		const stray = createFakeLeaf(app);
		Object.defineProperty(stray, 'parent', { value: {}, configurable: true });

		const result = getPanePaths(app, stray);

		expect(result).toEqual([]);
	});

	it('returns an empty array when the leaf has no pane', async () => {
		const app = createFakeWorkspaceApp();
		const first = await addFileTab(app, 'a.md', {});
		const second = await addFileTab(app, 'b.md', {});
		Object.defineProperty(first, 'parent', { value: undefined, configurable: true });
		Object.defineProperty(second, 'parent', { value: undefined, configurable: true });

		const result = getPanePaths(app, first);

		expect(result).toEqual([]);
	});
});

describe('createClusterFromDraft', () => {
	it('saves a Cluster with the draft\'s name, Flavor and the given members', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{ name: 'Research', flavor: '#ff8800' },
			['a.md', 'b.md'],
			500
		);

		expect(store.get().clusters[cluster.id]).toEqual({
			id: cluster.id,
			name: 'Research',
			flavor: '#ff8800',
			members: ['a.md', 'b.md'],
			lastTouchedAt: 500,
			pairedWith: null,
		});
	});

	it('leaves the other Clusters untouched', async () => {
		const existing = buildCluster({ id: 'existing' });
		const store = new SettingsStore(
			buildSettings({ clusters: buildClusters(existing) }),
			async () => {}
		);

		await createClusterFromDraft(
			store,
			{ name: 'New' },
			[]
		);

		expect(store.get().clusters.existing).toBe(existing);
	});

	it('persists the new settings', async () => {
		const persist = vi.fn(async () => {});
		const store = new SettingsStore(buildSettings(), persist);

		await createClusterFromDraft(
			store,
			{ name: 'New' },
			[]
		);

		expect(persist).toHaveBeenCalledTimes(1);
	});

	it('names a Cluster with a blank name Untitled', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{ name: '' },
			[]
		);

		expect(cluster.name).toBe(UNTITLED_CLUSTER_NAME);
	});

	it('leaves Flavor unset when the draft has none', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{ name: 'Plain' },
			[]
		);

		expect(cluster).not.toHaveProperty('flavor');
	});
});

describe('describeNewCluster', () => {
	it.each([
		['no members', [], 'Created empty Cluster "Research".'],
		['one member', ['a.md'], 'Created Cluster "Research" with 1 tab.'],
		['several members', ['a.md', 'b.md'], 'Created Cluster "Research" with 2 tabs.'],
	])('describes a Cluster with %s', (_kind, members, expected) => {
		const cluster = buildCluster({ name: 'Research', members });

		const result = describeNewCluster(cluster);

		expect(result).toBe(expected);
	});
});