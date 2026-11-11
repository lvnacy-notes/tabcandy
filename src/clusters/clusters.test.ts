/**
 * @file Tests for the Cluster operations and the rename watcher: each
 * operation's result, and that a no-op returns the same record by reference.
 */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import SettingsStore from '../settings/SettingsStore';
import {
	buildCluster,
	buildClusters,
	buildSettings,
	createConfiguredApp,
	getExistingFile
} from '../test/fakes';
import { UNTITLED_CLUSTER_NAME } from '../types';
import {
	addMember,
	createCluster,
	deleteCluster,
	generateClusterId,
	getClustersContainingPath,
	getMostRecentCluster,
	pairClusters,
	registerClusterRenameWatcher,
	removeMember,
	reorderMember,
	replaceMemberPath,
	touchCluster,
	unpairCluster
} from './clusters';

describe('generateClusterId', () => {
	it('returns 32 lowercase hex characters', () => {
		const id = generateClusterId();

		expect(id).toMatch(/^[0-9a-f]{32}$/);
	});

	it('returns a different id on each call', () => {
		const first = generateClusterId();
		const second = generateClusterId();

		expect(first).not.toBe(second);
	});
});

describe('createCluster', () => {
	it('adds a Cluster keyed by its own id, unpaired, stamped with the given time', () => {
		const clusters = buildClusters(buildCluster({ id: 'existing' }));

		const result = createCluster(
			clusters,
			{ name: 'Research' },
			1234,
			'new-id'
		);

		expect(result.clusters['new-id']).toEqual({
			id: 'new-id',
			name: 'Research',
			members: [],
			lastTouchedAt: 1234,
			pairedWith: null,
		});
		expect(result.cluster).toBe(result.clusters['new-id']);
		expect(result.clusters.existing).toBe(clusters.existing);
	});

	it('does not mutate the record it was given', () => {
		const clusters = buildClusters();

		createCluster(
			clusters,
			{ name: 'Research' },
			1,
			'new-id'
		);

		expect(clusters).toEqual({});
	});

	it('generates an id when none is given', () => {
		const result = createCluster({}, { name: 'Research' });

		expect(result.cluster.id).toMatch(/^[0-9a-f]{32}$/);
		expect(result.clusters[result.cluster.id]).toBe(result.cluster);
	});

	it('collapses repeated starting members, keeping the first of each in order', () => {
		const input = { name: 'Pane', members: ['a.md', 'b.md', 'a.md'] };

		const result = createCluster(
			{},
			input,
			1,
			'id'
		);

		expect(result.cluster.members).toEqual(['a.md', 'b.md']);
	});

	it('keeps a valid hex Flavor', () => {
		const input = { name: 'Colored', flavor: '#ff8800' };

		const result = createCluster(
			{},
			input,
			1,
			'id'
		);

		expect(result.cluster.flavor).toBe('#ff8800');
	});

	it('leaves Flavor unset when given something that is not a hex color', () => {
		const input = { name: 'Colored', flavor: 'red; background: url(x)' };

		const result = createCluster(
			{},
			input,
			1,
			'id'
		);

		expect(result.cluster).not.toHaveProperty('flavor');
	});

	it('falls back to the untitled name when the name is blank', () => {
		const input = { name: '   ' };

		const result = createCluster(
			{},
			input,
			1,
			'id'
		);

		expect(result.cluster.name).toBe(UNTITLED_CLUSTER_NAME);
	});
});

describe('deleteCluster', () => {
	it('removes the Cluster', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' })
		);

		const result = deleteCluster(clusters, 'a');

		expect(Object.keys(result)).toEqual(['b']);
	});

	it('unpairs the Cluster that was paired with the deleted one', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', pairedWith: 'b' }),
			buildCluster({ id: 'b', pairedWith: 'a' })
		);

		const result = deleteCluster(clusters, 'a');

		expect(result.b.pairedWith).toBeNull();
	});

	it('leaves unrelated Clusters as the same objects', () => {
		const unrelated = buildCluster({ id: 'c' });
		const clusters = buildClusters(
			buildCluster({ id: 'a' }),
			unrelated
		);

		const result = deleteCluster(clusters, 'a');

		expect(result.c).toBe(unrelated);
	});

	it('returns the same record when the id does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = deleteCluster(clusters, 'missing');

		expect(result).toBe(clusters);
	});
});

describe('addMember', () => {
	it('appends the path and bumps lastTouchedAt', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['one.md'], lastTouchedAt: 1 })
		);

		const result = addMember(
			clusters,
			'a',
			'two.md',
			50
		);

		expect(result.a.members).toEqual(['one.md', 'two.md']);
		expect(result.a.lastTouchedAt).toBe(50);
	});

	it('returns the same record when the path is already a member', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['one.md'] })
		);

		const result = addMember(
			clusters,
			'a',
			'one.md',
			50
		);

		expect(result).toBe(clusters);
	});

	it('returns the same record when the Cluster does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = addMember(
			clusters,
			'missing',
			'one.md',
			50
		);

		expect(result).toBe(clusters);
	});
});

describe('removeMember', () => {
	it('removes the path and bumps lastTouchedAt', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['one.md', 'two.md'], lastTouchedAt: 1 })
		);

		const result = removeMember(
			clusters,
			'a',
			'one.md',
			50
		);

		expect(result.a.members).toEqual(['two.md']);
		expect(result.a.lastTouchedAt).toBe(50);
	});

	it('returns the same record when the path is not a member', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['one.md'] })
		);

		const result = removeMember(
			clusters,
			'a',
			'other.md',
			50
		);

		expect(result).toBe(clusters);
	});

	it('returns the same record when the Cluster does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = removeMember(
			clusters,
			'missing',
			'one.md',
			50
		);

		expect(result).toBe(clusters);
	});
});

describe('reorderMember', () => {
	const members = ['a.md', 'b.md', 'c.md', 'd.md'];

	it('moves a member later in the list', () => {
		const clusters = buildClusters(buildCluster({ id: 'x', members }));

		const result = reorderMember(
			clusters,
			'x',
			0,
			2
		);

		expect(result.x.members).toEqual(['b.md', 'c.md', 'a.md', 'd.md']);
	});

	it('moves a member earlier in the list', () => {
		const clusters = buildClusters(buildCluster({ id: 'x', members }));

		const result = reorderMember(
			clusters,
			'x',
			3,
			1
		);

		expect(result.x.members).toEqual(['a.md', 'd.md', 'b.md', 'c.md']);
	});

	it('does not bump lastTouchedAt', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'x', members, lastTouchedAt: 7 })
		);

		const result = reorderMember(
			clusters,
			'x',
			0,
			1
		);

		expect(result.x.lastTouchedAt).toBe(7);
	});

	it('does not mutate the members array it was given', () => {
		const clusters = buildClusters(buildCluster({ id: 'x', members: [...members] }));

		reorderMember(
			clusters,
			'x',
			0,
			3
		);

		expect(clusters.x.members).toEqual(members);
	});

	it.each([
		['the source index is negative', -1, 1],
		['the source index is past the end', 4, 1],
		['the target index is negative', 1, -1],
		['the target index is past the end', 1, 4],
		['an index is not an integer', 0.5, 1],
		['the move is a no-op', 2, 2],
	])('returns the same record when %s', (_reason, fromIndex, toIndex) => {
		const clusters = buildClusters(buildCluster({ id: 'x', members }));

		const result = reorderMember(
			clusters,
			'x',
			fromIndex,
			toIndex
		);

		expect(result).toBe(clusters);
	});

	it('returns the same record when the Cluster does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'x', members }));

		const result = reorderMember(
			clusters,
			'missing',
			0,
			1
		);

		expect(result).toBe(clusters);
	});
});

describe('touchCluster', () => {
	it('sets lastTouchedAt', () => {
		const clusters = buildClusters(buildCluster({ id: 'a', lastTouchedAt: 1 }));

		const result = touchCluster(clusters, 'a', 99);

		expect(result.a.lastTouchedAt).toBe(99);
	});

	it('returns the same record when the Cluster does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = touchCluster(clusters, 'missing', 99);

		expect(result).toBe(clusters);
	});
});

describe('pairClusters', () => {
	it('points each Cluster at the other', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' })
		);

		const result = pairClusters(clusters, 'a', 'b');

		expect(result.a.pairedWith).toBe('b');
		expect(result.b.pairedWith).toBe('a');
	});

	it('does not bump lastTouchedAt on either side', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', lastTouchedAt: 3 }),
			buildCluster({ id: 'b', lastTouchedAt: 4 })
		);

		const result = pairClusters(clusters, 'a', 'b');

		expect(result.a.lastTouchedAt).toBe(3);
		expect(result.b.lastTouchedAt).toBe(4);
	});

	it('unpairs the previous partner of either side, keeping Pairing 1:1', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', pairedWith: 'x' }),
			buildCluster({ id: 'x', pairedWith: 'a' }),
			buildCluster({ id: 'b', pairedWith: 'y' }),
			buildCluster({ id: 'y', pairedWith: 'b' })
		);

		const result = pairClusters(clusters, 'a', 'b');

		expect(result.a.pairedWith).toBe('b');
		expect(result.b.pairedWith).toBe('a');
		expect(result.x.pairedWith).toBeNull();
		expect(result.y.pairedWith).toBeNull();
	});

	it('returns the same record when the two are already paired with each other', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', pairedWith: 'b' }),
			buildCluster({ id: 'b', pairedWith: 'a' })
		);

		const result = pairClusters(clusters, 'a', 'b');

		expect(result).toBe(clusters);
	});

	it('returns the same record when asked to pair a Cluster with itself', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = pairClusters(clusters, 'a', 'a');

		expect(result).toBe(clusters);
	});

	it('returns the same record when either Cluster does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = pairClusters(clusters, 'a', 'missing');

		expect(result).toBe(clusters);
	});
});

describe('unpairCluster', () => {
	it('clears the Pairing on both sides', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', pairedWith: 'b' }),
			buildCluster({ id: 'b', pairedWith: 'a' })
		);

		const result = unpairCluster(clusters, 'a');

		expect(result.a.pairedWith).toBeNull();
		expect(result.b.pairedWith).toBeNull();
	});

	it('returns the same record when the Cluster is not paired', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = unpairCluster(clusters, 'a');

		expect(result).toBe(clusters);
	});

	it('returns the same record when the Cluster does not exist', () => {
		const clusters = buildClusters(buildCluster({ id: 'a' }));

		const result = unpairCluster(clusters, 'missing');

		expect(result).toBe(clusters);
	});
});

describe('getMostRecentCluster', () => {
	it('returns the Cluster with the highest lastTouchedAt', () => {
		const newest = buildCluster({ id: 'b', lastTouchedAt: 20 });
		const clusters = buildClusters(
			buildCluster({ id: 'a', lastTouchedAt: 10 }),
			newest,
			buildCluster({ id: 'c', lastTouchedAt: 5 })
		);

		const result = getMostRecentCluster(clusters);

		expect(result).toBe(newest);
	});

	it('goes to the first Cluster in the record when lastTouchedAt ties', () => {
		const first = buildCluster({ id: 'a', lastTouchedAt: 10 });
		const clusters = buildClusters(
			first,
			buildCluster({ id: 'b', lastTouchedAt: 10 })
		);

		const result = getMostRecentCluster(clusters);

		expect(result).toBe(first);
	});

	it('returns null when there are no Clusters', () => {
		const result = getMostRecentCluster({});

		expect(result).toBeNull();
	});
});

describe('getClustersContainingPath', () => {
	it('returns every Cluster listing the path, in record order', () => {
		const a = buildCluster({ id: 'a', members: ['shared.md'] });
		const c = buildCluster({ id: 'c', members: ['x.md', 'shared.md'] });
		const clusters = buildClusters(
			a,
			buildCluster({ id: 'b', members: ['other.md'] }),
			c
		);

		const result = getClustersContainingPath(clusters, 'shared.md');

		expect(result).toEqual([a, c]);
	});

	it('returns an empty array when no Cluster lists the path', () => {
		const clusters = buildClusters(buildCluster({ id: 'a', members: ['x.md'] }));

		const result = getClustersContainingPath(clusters, 'nope.md');

		expect(result).toEqual([]);
	});
});

describe('replaceMemberPath', () => {
	/** Shaped like `getLayout()` output: a split of tabs holding leaves. */
	function buildLayout(...files: string[]): Record<string, unknown> {
		return {
			main: {
				id: 'split-1',
				type: 'split',
				children: [
					{
						id: 'tabs-1',
						type: 'tabs',
						children: files.map((file, index) => ({
							id: `leaf-${ index }`,
							type: 'leaf',
							state: {
								type: 'markdown',
								state: { file, mode: 'source' },
							},
						})),
					},
				],
			},
			active: 'leaf-0',
		};
	}

	it('replaces the path in members at the same position', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['x.md', 'old.md', 'z.md'] })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.members).toEqual(['x.md', 'new.md', 'z.md']);
	});

	it('replaces the path in every Cluster that lists it', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['old.md'] }),
			buildCluster({ id: 'b', members: ['old.md'] })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.members).toEqual(['new.md']);
		expect(result.b.members).toEqual(['new.md']);
	});

	it('does not bump lastTouchedAt', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['old.md'], lastTouchedAt: 5 })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.lastTouchedAt).toBe(5);
	});

	it('drops the repeat instead of listing the same file twice when the new path is already a member', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['new.md', 'old.md', 'z.md'] })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.members).toEqual(['new.md', 'z.md']);
	});

	it('replaces the file path in the matching leaf of layoutSnapshot', () => {
		const clusters = buildClusters(
			buildCluster({
				id: 'a',
				members: ['old.md', 'keep.md'],
				layoutSnapshot: buildLayout('old.md', 'keep.md'),
			})
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.layoutSnapshot).toEqual(buildLayout('new.md', 'keep.md'));
	});

	it('patches layoutSnapshot even when members no longer lists the path', () => {
		const clusters = buildClusters(
			buildCluster({
				id: 'a',
				members: [],
				layoutSnapshot: buildLayout('old.md'),
			})
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.layoutSnapshot).toEqual(buildLayout('new.md'));
	});

	it('does not touch a file path that sits outside a leaf node', () => {
		const layout = { ...buildLayout('keep.md'), lastOpenFiles: ['old.md'] };
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['old.md'], layoutSnapshot: layout })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.layoutSnapshot).toEqual(layout);
	});

	it('does not mutate the layoutSnapshot it was given', () => {
		const layout = buildLayout('old.md');
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['old.md'], layoutSnapshot: layout })
		);

		replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(layout).toEqual(buildLayout('old.md'));
	});

	it('is a no-op for a Cluster whose layoutSnapshot does not contain the path', () => {
		const layout = buildLayout('keep.md');
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['old.md'], layoutSnapshot: layout })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a.layoutSnapshot).toBe(layout);
	});

	it('leaves a Cluster with no layoutSnapshot without one', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['old.md'] })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result.a).not.toHaveProperty('layoutSnapshot');
	});

	it('returns the same record when the path is stored nowhere', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['x.md'], layoutSnapshot: buildLayout('x.md') })
		);

		const result = replaceMemberPath(
			clusters,
			'old.md',
			'new.md'
		);

		expect(result).toBe(clusters);
	});

	it('returns the same record when the old and new paths are equal', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a', members: ['same.md'] })
		);

		const result = replaceMemberPath(
			clusters,
			'same.md',
			'same.md'
		);

		expect(result).toBe(clusters);
	});
});

describe('registerClusterRenameWatcher', () => {
	function setUp(files: Record<string, string>, members: string[]) {
		const app = createConfiguredApp({ files });
		const store = new SettingsStore(
			buildSettings({
				clusters: buildClusters(buildCluster({ id: 'a', members })),
			}),
			async () => {}
		);
		const registerEvent = vi.fn();
		registerClusterRenameWatcher(
			app,
			store,
			registerEvent
		);
		return { app, store, registerEvent };
	}

	it('registers exactly one listener', () => {
		const { registerEvent } = setUp({}, []);

		expect(registerEvent).toHaveBeenCalledTimes(1);
	});

	it('patches the member path when a file is renamed', async () => {
		const { app, store } = setUp({ 'Notes/old.md': '' }, ['Notes/old.md']);
		const file = getExistingFile(app, 'Notes/old.md');

		await app.vault.rename(file, 'Notes/new.md');

		expect(store.get().clusters.a.members).toEqual(['Notes/new.md']);
	});

	it('patches the member path when a file is moved to another folder', async () => {
		const { app, store } = setUp({ 'Notes/old.md': '' }, ['Notes/old.md']);
		const file = getExistingFile(app, 'Notes/old.md');

		await app.vault.rename(file, 'Archive/old.md');

		expect(store.get().clusters.a.members).toEqual(['Archive/old.md']);
	});

	it('does not save when the renamed file is in no Cluster', async () => {
		const { app, store } = setUp(
			{ 'Notes/other.md': '' },
			['Notes/member.md']
		);
		const updateSpy = vi.spyOn(store, 'update');
		const file = getExistingFile(app, 'Notes/other.md');

		await app.vault.rename(file, 'Notes/renamed.md');

		expect(updateSpy).not.toHaveBeenCalled();
	});

	it('does not drop a member whose file is deleted', async () => {
		const { app, store } = setUp({ 'Notes/member.md': '' }, ['Notes/member.md']);
		const file = getExistingFile(app, 'Notes/member.md');

		await app.fileManager.trashFile(file);

		expect(store.get().clusters.a.members).toEqual(['Notes/member.md']);
	});
});