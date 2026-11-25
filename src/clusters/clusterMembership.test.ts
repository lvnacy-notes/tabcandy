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
	openMemberFile,
	promptAndAdd,
	promptAndRemove,
	removeMissingMembers,
	removePathFromClusters,
	reorderClusterMember,
	resolveMissingMember
} from './clusterMembership';
import {
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
	buildStore,
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
	const store = new SettingsStore(
		buildSettings({ clusters: buildClusters(...clusters) }),
		save
	);
	return {
		store,
		save
	};
}

describe('addPathToCluster', () => {
	it('appends the file to the Cluster\'s members', async () => {
		const store = buildStoreWith(buildCluster({ members: ['a.md'] }));

		await addPathToCluster(
			store,
			'cluster-a',
			'b.md'
		);

		expect(store.get().clusters['cluster-a'].members).toEqual([
			'a.md',
			'b.md'
		]);
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
		const {
			store,
			save
		} = buildCountingStore(buildCluster({ members: ['a.md'] }));

		await addPathToCluster(
			store,
			'cluster-a',
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('returns false and saves nothing when the Cluster does not exist', async () => {
		const {
			store,
			save
		} = buildCountingStore();

		const result = await addPathToCluster(
			store,
			'missing',
			'a.md'
		);

		expect([
			result,
			save.mock.calls.length
		]).toEqual([
			false,
			0
		]);
	});
});

describe('addToMostRecentCluster', () => {
	it('adds the file to the Cluster with the highest lastTouchedAt', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'old',
				lastTouchedAt: 1
			}),
			buildCluster({
				id: 'new',
				lastTouchedAt: 9
			})
		);

		addToMostRecentCluster(
			store,
			'a.md'
		);

		expect(store.get().clusters['new'].members).toEqual(['a.md']);
	});

	it('leaves the other Clusters untouched', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'old',
				lastTouchedAt: 1
			}),
			buildCluster({
				id: 'new',
				lastTouchedAt: 9
			})
		);

		addToMostRecentCluster(
			store,
			'a.md'
		);

		expect(store.get().clusters['old'].members).toEqual([]);
	});

	it('does nothing when there are no Clusters', () => {
		const {
			store,
			save
		} = buildCountingStore();

		addToMostRecentCluster(
			store,
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});
});

describe('describeAddition', () => {
	it('says the file was added', () => {
		expect(describeAddition(
			'Reading',
			true
		)).toBe('Added to Reading.');
	});

	it('says the Cluster already held the file', () => {
		expect(describeAddition(
			'Reading',
			false
		)).toBe('Already in Reading.');
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

describe('openMemberFile', () => {
	it('opens a present file in the active pane', async () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const leaf = app.workspace.getLeaf(true);
		const openFile = vi.spyOn(
			leaf,
			'openFile'
		).mockResolvedValue();
		vi.spyOn(
			app.workspace,
			'getLeaf'
		).mockReturnValue(leaf);

		await openMemberFile(
			app,
			'a.md'
		);

		expect(openFile).toHaveBeenCalledTimes(1);
	});

	it('does nothing when the file is missing', async () => {
		const app = createConfiguredApp();
		const getLeaf = vi.spyOn(
			app.workspace,
			'getLeaf'
		);

		await openMemberFile(
			app,
			'gone.md'
		);

		expect(getLeaf).not.toHaveBeenCalled();
	});

	it('does nothing when the path is a folder', async () => {
		const app = createConfiguredApp();
		await app.vault.createFolder('Folder');
		const getLeaf = vi.spyOn(
			app.workspace,
			'getLeaf'
		);

		await openMemberFile(
			app,
			'Folder'
		);

		expect(getLeaf).not.toHaveBeenCalled();
	});
});

describe('promptAndAdd', () => {
	it('offers every Cluster to the prompt', () => {
		const first = buildCluster({ id: 'one' });
		const second = buildCluster({ id: 'two' });
		const {
			prompt,
			spy
		} = choosingNothing();

		promptAndAdd(
			buildStoreWith(
				first,
				second
			),
			prompt,
			'a.md'
		);

		expect(spy.mock.calls[0][0]).toEqual([
			first,
			second
		]);
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
		const {
			store,
			save
		} = buildCountingStore(buildCluster());

		promptAndAdd(
			store,
			choosingNothing().prompt,
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('does not prompt when there are no Clusters', () => {
		const {
			prompt,
			spy
		} = choosingNothing();

		promptAndAdd(
			buildStore(),
			prompt,
			'a.md'
		);

		expect(spy).not.toHaveBeenCalled();
	});

	it('adds nothing when the chosen Cluster no longer exists', () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster());

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
			buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				]
			}),
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
		const {
			prompt,
			spy
		} = selectingNothing();

		promptAndRemove(
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			prompt,
			'a.md'
		);

		expect(spy).not.toHaveBeenCalled();
	});

	it('offers only the Clusters holding the file when several do', () => {
		const first = buildCluster({
			id: 'one',
			members: ['a.md']
		});
		const second = buildCluster({
			id: 'two',
			members: ['a.md']
		});
		const other = buildCluster({ id: 'three' });
		const {
			prompt,
			spy
		} = selectingNothing();

		promptAndRemove(
			buildStoreWith(
				first,
				second,
				other
			),
			prompt,
			'a.md'
		);

		expect(spy.mock.calls[0][0]).toEqual([
			first,
			second
		]);
	});

	it('removes the file from the selected Clusters only', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['a.md']
			})
		);

		promptAndRemove(
			store,
			selecting(['two']).prompt,
			'a.md'
		);

		expect([
			store.get().clusters['one'].members,
			store.get().clusters['two'].members
		]).toEqual([
			['a.md'],
			[]
		]);
	});

	it('removes nothing when the prompt is cancelled', () => {
		const {
			store,
			save
		} = buildCountingStore(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['a.md']
			})
		);

		promptAndRemove(
			store,
			selectingNothing().prompt,
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('does nothing when no Cluster holds the file', () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster());
		const {
			prompt,
			spy
		} = selectingNothing();

		promptAndRemove(
			store,
			prompt,
			'a.md'
		);

		expect([
			save.mock.calls.length,
			spy.mock.calls.length
		]).toEqual([
			0,
			0
		]);
	});
});

describe('removePathFromClusters', () => {
	it('removes the file from every listed Cluster', async () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['a.md']
			})
		);

		await removePathFromClusters(
			store,
			[
				'one',
				'two'
			],
			'a.md'
		);

		expect([
			store.get().clusters['one'].members,
			store.get().clusters['two'].members
		]).toEqual([
			[],
			[]
		]);
	});

	it('saves once however many Clusters change', async () => {
		const {
			store,
			save
		} = buildCountingStore(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['a.md']
			})
		);

		await removePathFromClusters(
			store,
			[
				'one',
				'two'
			],
			'a.md'
		);

		expect(save).toHaveBeenCalledTimes(1);
	});

	it('returns the number of Clusters the file was removed from', async () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({ id: 'two' })
		);

		const result = await removePathFromClusters(
			store,
			[
				'one',
				'two'
			],
			'a.md'
		);

		expect(result).toBe(1);
	});

	it('keeps the other members in order', async () => {
		const store = buildStoreWith(buildCluster({ members: [
			'a.md',
			'b.md',
			'c.md'
		] }));

		await removePathFromClusters(
			store,
			['cluster-a'],
			'b.md'
		);

		expect(store.get().clusters['cluster-a'].members).toEqual([
			'a.md',
			'c.md'
		]);
	});

	it('saves nothing when no listed Cluster holds the file', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster());

		await removePathFromClusters(
			store,
			['cluster-a'],
			'a.md'
		);

		expect(save).not.toHaveBeenCalled();
	});
});

describe('reorderClusterMember', () => {
	it('moves the member and saves', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md',
				'c.md'
			]
		}));

		const moved = await reorderClusterMember(
			store,
			'one',
			0,
			2
		);

		expect([
			moved,
			store.get().clusters['one'].members
		]).toEqual([
			true,
			[
				'b.md',
				'c.md',
				'a.md'
			]
		]);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('saves nothing when the move changes nothing', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		const moved = await reorderClusterMember(
			store,
			'one',
			1,
			1
		);

		expect(moved).toBe(false);
		expect(save).not.toHaveBeenCalled();
	});

	it('saves nothing for a Cluster that does not exist', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		const moved = await reorderClusterMember(
			store,
			'missing',
			0,
			1
		);

		expect(moved).toBe(false);
		expect(save).not.toHaveBeenCalled();
	});
});

describe('removeMissingMembers', () => {
	it('removes the given paths in one save', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'gone.md',
				'also-gone.md'
			]
		}));

		const removed = await removeMissingMembers(
			store,
			'one',
			[
				'gone.md',
				'also-gone.md'
			]
		);

		expect([
			removed,
			store.get().clusters['one'].members
		]).toEqual([
			true,
			['a.md']
		]);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('saves nothing when the Cluster holds none of the paths', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: ['a.md']
		}));

		const removed = await removeMissingMembers(
			store,
			'one',
			['gone.md']
		);

		expect(removed).toBe(false);
		expect(save).not.toHaveBeenCalled();
	});
});

describe('resolveMissingMember', () => {
	it('replaces the stale path at its position', async () => {
		const { store } = buildCountingStore(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'gone.md',
				'c.md'
			]
		}));

		const replaced = await resolveMissingMember(
			store,
			'one',
			'gone.md',
			'b.md'
		);

		expect([
			replaced,
			store.get().clusters['one'].members
		]).toEqual([
			true,
			[
				'a.md',
				'b.md',
				'c.md'
			]
		]);
	});

	it('leaves other Clusters holding the same stale path as they are', async () => {
		const { store } = buildCountingStore(
			buildCluster({
				id: 'one',
				members: ['gone.md']
			}),
			buildCluster({
				id: 'two',
				members: ['gone.md']
			})
		);

		await resolveMissingMember(
			store,
			'one',
			'gone.md',
			'b.md'
		);

		expect([
			store.get().clusters['one'].members,
			store.get().clusters['two'].members
		]).toEqual([
			['b.md'],
			['gone.md']
		]);
	});

	it('refuses a replacement the Cluster already holds and saves nothing', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'gone.md'
			]
		}));

		const replaced = await resolveMissingMember(
			store,
			'one',
			'gone.md',
			'a.md'
		);

		expect([
			replaced,
			store.get().clusters['one'].members
		]).toEqual([
			false,
			[
				'a.md',
				'gone.md'
			]
		]);
		expect(save).not.toHaveBeenCalled();
	});

	it('saves nothing when the Cluster does not hold the stale path', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: ['a.md']
		}));

		const replaced = await resolveMissingMember(
			store,
			'one',
			'gone.md',
			'b.md'
		);

		expect(replaced).toBe(false);
		expect(save).not.toHaveBeenCalled();
	});

	it('saves nothing when the Cluster does not exist', async () => {
		const {
			store,
			save
		} = buildCountingStore(buildCluster({
			id: 'one',
			members: ['gone.md']
		}));

		const replaced = await resolveMissingMember(
			store,
			'missing',
			'gone.md',
			'b.md'
		);

		expect(replaced).toBe(false);
		expect(save).not.toHaveBeenCalled();
	});
});


/**
 * Builds a store holding two paired Clusters with sync on.
 *
 * @param one - Members of the Cluster `one`.
 * @param two - Members of the Cluster `two`.
 * @returns The store.
 */
function buildSyncedStore(one: string[], two: string[]): SettingsStore {
	return buildStore({
		keepPairedClustersInSync: true,
		clusters: buildClusters(
			buildCluster({
				id: 'one',
				members: one,
				pairedWith: 'two',
			}),
			buildCluster({
				id: 'two',
				members: two,
				pairedWith: 'one',
			})
		),
	});
}

describe('reorderClusterMember with keepPairedClustersInSync on', () => {
	it('makes the same move in the paired Cluster', async () => {
		const store = buildSyncedStore(
			[
				'a.md',
				'b.md',
				'c.md'
			],
			[
				'x.md',
				'y.md',
				'z.md'
			]
		);

		await reorderClusterMember(
			store,
			'one',
			0,
			2
		);

		expect(store.get().clusters['two'].members).toEqual([
			'y.md',
			'z.md',
			'x.md'
		]);
	});

	it('does nothing to the paired Cluster when a position is out of its range', async () => {
		const store = buildSyncedStore(
			[
				'a.md',
				'b.md',
				'c.md'
			],
			[
				'x.md',
				'y.md'
			]
		);

		await reorderClusterMember(
			store,
			'one',
			0,
			2
		);

		expect(store.get().clusters['two'].members).toEqual([
			'x.md',
			'y.md'
		]);
	});

	it('does not mirror when the move changes nothing', async () => {
		const {
			store,
			save
		} = buildCountingStore(
			buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				],
				pairedWith: 'two',
			}),
			buildCluster({
				id: 'two',
				members: [
					'x.md',
					'y.md'
				],
				pairedWith: 'one',
			})
		);

		await reorderClusterMember(
			store,
			'one',
			1,
			1
		);

		expect(save).not.toHaveBeenCalled();
	});

	it('leaves the paired Cluster alone when sync is off', async () => {
		const store = buildStore({ clusters: buildClusters(
			buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				],
				pairedWith: 'two',
			}),
			buildCluster({
				id: 'two',
				members: [
					'x.md',
					'y.md'
				],
				pairedWith: 'one',
			})
		) });

		await reorderClusterMember(
			store,
			'one',
			0,
			1
		);

		expect(store.get().clusters['two'].members).toEqual([
			'x.md',
			'y.md'
		]);
	});

	it('saves both Clusters in one save', async () => {
		const save = vi.fn(async () => {});
		const store = new SettingsStore(
			buildSettings({
				keepPairedClustersInSync: true,
				clusters: buildClusters(
					buildCluster({
						id: 'one',
						members: [
							'a.md',
							'b.md'
						],
						pairedWith: 'two',
					}),
					buildCluster({
						id: 'two',
						members: [
							'x.md',
							'y.md'
						],
						pairedWith: 'one',
					})
				),
			}),
			save
		);

		await reorderClusterMember(
			store,
			'one',
			0,
			1
		);

		expect(save).toHaveBeenCalledTimes(1);
	});
});

describe('removePathFromClusters with keepPairedClustersInSync on', () => {
	it('removes the member at the same position from the paired Cluster', async () => {
		const store = buildSyncedStore(
			[
				'a.md',
				'b.md',
				'c.md'
			],
			[
				'x.md',
				'y.md',
				'z.md'
			]
		);

		await removePathFromClusters(
			store,
			['one'],
			'b.md'
		);

		expect(store.get().clusters['two'].members).toEqual([
			'x.md',
			'z.md'
		]);
	});

	it('does nothing to the paired Cluster when it has no member at that position', async () => {
		const store = buildSyncedStore(
			[
				'a.md',
				'b.md',
				'c.md'
			],
			['x.md']
		);

		await removePathFromClusters(
			store,
			['one'],
			'c.md'
		);

		expect(store.get().clusters['two'].members).toEqual(['x.md']);
	});

	it('removes by position even when the paired member\'s file is missing', async () => {
		const store = buildSyncedStore(
			[
				'a.md',
				'b.md'
			],
			[
				'gone.md',
				'y.md'
			]
		);

		await removePathFromClusters(
			store,
			['one'],
			'a.md'
		);

		expect(store.get().clusters['two'].members).toEqual(['y.md']);
	});

	it('does not count the mirrored removal', async () => {
		const store = buildSyncedStore(
			['a.md'],
			['x.md']
		);

		const count = await removePathFromClusters(
			store,
			['one'],
			'a.md'
		);

		expect(count).toBe(1);
	});

	it('does not mirror onto a paired Cluster that was listed too', async () => {
		const store = buildSyncedStore(
			[
				'a.md',
				'b.md'
			],
			[
				'a.md',
				'b.md'
			]
		);

		await removePathFromClusters(
			store,
			[
				'one',
				'two'
			],
			'a.md'
		);

		expect([
			store.get().clusters['one'].members,
			store.get().clusters['two'].members
		]).toEqual([
			['b.md'],
			['b.md']
		]);
	});

	it('leaves the paired Cluster alone when sync is off', async () => {
		const store = buildStore({ clusters: buildClusters(
			buildCluster({
				id: 'one',
				members: ['a.md'],
				pairedWith: 'two',
			}),
			buildCluster({
				id: 'two',
				members: ['x.md'],
				pairedWith: 'one',
			})
		) });

		await removePathFromClusters(
			store,
			['one'],
			'a.md'
		);

		expect(store.get().clusters['two'].members).toEqual(['x.md']);
	});

	it('goes one hop only', async () => {
		const store = buildStore({
			keepPairedClustersInSync: true,
			clusters: buildClusters(
				buildCluster({
					id: 'one',
					members: ['a.md'],
					pairedWith: 'two',
				}),
				buildCluster({
					id: 'two',
					members: ['x.md'],
					pairedWith: 'one',
				}),
				buildCluster({
					id: 'three',
					members: ['q.md']
				})
			),
		});

		await removePathFromClusters(
			store,
			['one'],
			'a.md'
		);

		expect(store.get().clusters['three'].members).toEqual(['q.md']);
	});
});