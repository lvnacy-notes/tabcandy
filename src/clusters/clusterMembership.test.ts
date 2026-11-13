/** @file Tests for adding a file to Clusters and removing it from them. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	addPathToCluster,
	addToMostRecentCluster,
	describeAddition,
	describeRemoval,
	getActiveTabPath,
	openMemberFile,
	promptAndAdd,
	promptAndRemove,
	removePathFromClusters
} from './clusterMembership';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	buildStoreWith,
	choosing,
	choosingNothing,
	selecting,
	selectingNothing
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildClusters,
	buildSettings,
	createConfiguredApp
} from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';

/**
 * Builds a store holding the given Clusters whose saves are counted.
 *
 * @param clusters - The Clusters to hold.
 * @returns The store and the save spy.
 */
function buildCountingStore(...clusters: Parameters<typeof buildClusters>): {
	store: SettingsStore;
	save: ReturnType<typeof vi.fn>;
} {
	const save = vi.fn(async () => {});
	const store = new SettingsStore(buildSettings({ clusters: buildClusters(...clusters) }), save);
	return { store, save };
}

describe('addPathToCluster', () => {
	it('appends the file to the Cluster\'s members', async () => {
		const store = buildStoreWith(buildCluster({ members: ['a.md'] }));

		await addPathToCluster(
			store,
			'cluster-a',
			'b.md'
		);

		expect(store.get().clusters['cluster-a'].members).toEqual(['a.md', 'b.md']);
	});

	it('bumps the Cluster\'s lastTouchedAt', async () => {
		const store = buildStoreWith(buildCluster({ lastTouchedAt: 1 }));

		await addPathToCluster(
			store,
			'cluster-a',
			'a.md'
		);

		expect(store.get().clusters['cluster-a'].lastTouchedAt).toBeGreaterThan(1);
	});

	it('returns true when the file was added', async () => {
		const store = buildStoreWith(buildCluster());

		const result = await addPathToCluster(
			store,
			'cluster-a',
			'a.md'
		);

		expect(result).toBe(true);
	});

	it('returns false when the Cluster already holds the file', async () => {
		const store = buildStoreWith(buildCluster({ members: ['a.md'] }));

		const result = await addPathToCluster(
			store,
			'cluster-a',
			'a.md'
		);

		expect(result).toBe(false);
	});

	it('saves nothing when the Cluster already holds the file', async () => {
		const { store, save } = buildCountingStore(buildCluster({ members: ['a.md'] }));

		await addPathToCluster(
			store,
			'cluster-a',
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('returns false and saves nothing when the Cluster does not exist', async () => {
		const { store, save } = buildCountingStore();

		const result = await addPathToCluster(
			store,
			'missing',
			'a.md'
		);

		expect([result, save.mock.calls.length]).toEqual([false, 0]);
	});
});

describe('addToMostRecentCluster', () => {
	it('adds the file to the Cluster with the highest lastTouchedAt', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'old', lastTouchedAt: 1 }),
			buildCluster({ id: 'new', lastTouchedAt: 9 })
		);

		addToMostRecentCluster(store, 'a.md');

		expect(store.get().clusters['new'].members).toEqual(['a.md']);
	});

	it('leaves the other Clusters untouched', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'old', lastTouchedAt: 1 }),
			buildCluster({ id: 'new', lastTouchedAt: 9 })
		);

		addToMostRecentCluster(store, 'a.md');

		expect(store.get().clusters['old'].members).toEqual([]);
	});

	it('does nothing when there are no Clusters', () => {
		const { store, save } = buildCountingStore();

		addToMostRecentCluster(store, 'a.md');

		expect(save).not.toHaveBeenCalled();
	});
});

describe('describeAddition', () => {
	it('says the file was added', () => {
		expect(describeAddition('Reading', true)).toBe('Added to Reading.');
	});

	it('says the Cluster already held the file', () => {
		expect(describeAddition('Reading', false)).toBe('Already in Reading.');
	});
});

describe('describeRemoval', () => {
	it('describes removal from one Cluster', () => {
		expect(describeRemoval(1)).toBe('Removed from 1 cluster.');
	});

	it('describes removal from several Clusters', () => {
		expect(describeRemoval(3)).toBe('Removed from 3 clusters.');
	});
});

describe('getActiveTabPath', () => {
	it('returns the file path of the most recent tab', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));

		const result = getActiveTabPath(app);

		expect(result).toBe('a.md');
	});

	it('returns null when the most recent tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addNonFileTab(app, {}));

		const result = getActiveTabPath(app);

		expect(result).toBeNull();
	});

	it('returns null when there is no most recent tab', () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, null);

		const result = getActiveTabPath(app);

		expect(result).toBeNull();
	});
});

describe('openMemberFile', () => {
	it('opens a present file in the active pane', async () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const leaf = app.workspace.getLeaf(true);
		const openFile = vi.spyOn(leaf, 'openFile').mockResolvedValue();
		vi.spyOn(app.workspace, 'getLeaf').mockReturnValue(leaf);

		await openMemberFile(app, 'a.md');

		expect(openFile).toHaveBeenCalledTimes(1);
	});

	it('does nothing when the file is missing', async () => {
		const app = createConfiguredApp();
		const getLeaf = vi.spyOn(app.workspace, 'getLeaf');

		await openMemberFile(app, 'gone.md');

		expect(getLeaf).not.toHaveBeenCalled();
	});

	it('does nothing when the path is a folder', async () => {
		const app = createConfiguredApp();
		await app.vault.createFolder('Folder');
		const getLeaf = vi.spyOn(app.workspace, 'getLeaf');

		await openMemberFile(app, 'Folder');

		expect(getLeaf).not.toHaveBeenCalled();
	});
});

describe('promptAndAdd', () => {
	it('offers every Cluster to the prompt', () => {
		const first = buildCluster({ id: 'one' });
		const second = buildCluster({ id: 'two' });
		const { prompt, spy } = choosingNothing();

		promptAndAdd(
			buildStoreWith(first, second),
			prompt,
			'a.md'
		);

		expect(spy.mock.calls[0][0]).toEqual([first, second]);
	});

	it('adds the file to the chosen Cluster', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);

		promptAndAdd(
			store,
			choosing('two').prompt,
			'a.md'
		);

		expect(store.get().clusters['two'].members).toEqual(['a.md']);
	});

	it('leaves the other Clusters untouched', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);

		promptAndAdd(
			store,
			choosing('two').prompt,
			'a.md'
		);

		expect(store.get().clusters['one'].members).toEqual([]);
	});

	it('adds nothing when the prompt is cancelled', () => {
		const { store, save } = buildCountingStore(buildCluster());

		promptAndAdd(
			store,
			choosingNothing().prompt,
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('does not prompt when there are no Clusters', () => {
		const { prompt, spy } = choosingNothing();

		promptAndAdd(
			buildStore(),
			prompt,
			'a.md'
		);

		expect(spy).not.toHaveBeenCalled();
	});

	it('adds nothing when the chosen Cluster no longer exists', () => {
		const { store, save } = buildCountingStore(buildCluster());

		promptAndAdd(
			store,
			choosing('gone').prompt,
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});
});

describe('promptAndRemove', () => {
	it('removes the file directly when exactly one Cluster holds it', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md', 'b.md'] }),
			buildCluster({ id: 'two' })
		);

		promptAndRemove(
			store,
			selectingNothing().prompt,
			'a.md'
		);

		expect(store.get().clusters['one'].members).toEqual(['b.md']);
	});

	it('does not prompt when exactly one Cluster holds the file', () => {
		const { prompt, spy } = selectingNothing();

		promptAndRemove(
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			prompt,
			'a.md'
		);

		expect(spy).not.toHaveBeenCalled();
	});

	it('offers only the Clusters holding the file when several do', () => {
		const first = buildCluster({ id: 'one', members: ['a.md'] });
		const second = buildCluster({ id: 'two', members: ['a.md'] });
		const other = buildCluster({ id: 'three' });
		const { prompt, spy } = selectingNothing();

		promptAndRemove(
			buildStoreWith(
				first,
				second,
				other
			),
			prompt,
			'a.md'
		);

		expect(spy.mock.calls[0][0]).toEqual([first, second]);
	});

	it('removes the file from the selected Clusters only', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);

		promptAndRemove(
			store,
			selecting(['two']).prompt,
			'a.md'
		);

		expect([store.get().clusters['one'].members, store.get().clusters['two'].members]).toEqual([['a.md'], []]);
	});

	it('removes nothing when the prompt is cancelled', () => {
		const { store, save } = buildCountingStore(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);

		promptAndRemove(
			store,
			selectingNothing().prompt,
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('does nothing when no Cluster holds the file', () => {
		const { store, save } = buildCountingStore(buildCluster());
		const { prompt, spy } = selectingNothing();

		promptAndRemove(
			store,
			prompt,
			'a.md'
		);

		expect([save.mock.calls.length, spy.mock.calls.length]).toEqual([0, 0]);
	});
});

describe('removePathFromClusters', () => {
	it('removes the file from every listed Cluster', async () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);

		await removePathFromClusters(
			store,
			['one', 'two'],
			'a.md'
		);

		expect([store.get().clusters['one'].members, store.get().clusters['two'].members]).toEqual([[], []]);
	});

	it('saves once however many Clusters change', async () => {
		const { store, save } = buildCountingStore(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);

		await removePathFromClusters(
			store,
			['one', 'two'],
			'a.md'
		);

		expect(save).toHaveBeenCalledTimes(1);
	});

	it('returns the number of Clusters the file was removed from', async () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two' })
		);

		const result = await removePathFromClusters(
			store,
			['one', 'two'],
			'a.md'
		);

		expect(result).toBe(1);
	});

	it('keeps the other members in order', async () => {
		const store = buildStoreWith(buildCluster({ members: ['a.md', 'b.md', 'c.md'] }));

		await removePathFromClusters(
			store,
			['cluster-a'],
			'b.md'
		);

		expect(store.get().clusters['cluster-a'].members).toEqual(['a.md', 'c.md']);
	});

	it('saves nothing when no listed Cluster holds the file', async () => {
		const { store, save } = buildCountingStore(buildCluster());

		await removePathFromClusters(
			store,
			['cluster-a'],
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});
});