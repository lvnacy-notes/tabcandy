/** @file Tests for pairing Clusters and unlinking them. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	describeUnlinks,
	getActiveClusters,
	pairWithConfirmation,
	promptAndPair,
	promptAndUnlink,
	unlinkCluster
} from './clusterPairing';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith,
	choosing,
	choosingNothing,
	confirming,
	confirmingNothing
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildClusters
} from '../test/fakes';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';

describe('describeUnlinks', () => {
	it('says nothing when neither Cluster is paired', () => {
		const clusters = buildClusters(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' })
		);

		expect(describeUnlinks(
			clusters,
			clusters['a'],
			clusters['b']
		)).toBe('');
	});

	it('names the Cluster the source is paired with', () => {
		const clusters = buildClusters(
			buildCluster({
				id: 'a',
				name: 'X',
				pairedWith: 'c',
			}),
			buildCluster({
				id: 'b',
				name: 'Z'
			}),
			buildCluster({
				id: 'c',
				name: 'Y',
				pairedWith: 'a',
			})
		);

		expect(describeUnlinks(
			clusters,
			clusters['a'],
			clusters['b']
		)).toBe('X is paired with Y. Pairing it with Z unlinks Y.');
	});

	it('names the Cluster the target is paired with', () => {
		const clusters = buildClusters(
			buildCluster({
				id: 'a',
				name: 'X'
			}),
			buildCluster({
				id: 'b',
				name: 'Z',
				pairedWith: 'c',
			}),
			buildCluster({
				id: 'c',
				name: 'Y',
				pairedWith: 'b',
			})
		);

		expect(describeUnlinks(
			clusters,
			clusters['a'],
			clusters['b']
		)).toBe('Z is paired with Y. Pairing it with X unlinks Y.');
	});
});

describe('getActiveClusters', () => {
	it('returns every Cluster holding the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['a.md']
			}),
			buildCluster({
				id: 'three',
				members: ['b.md']
			})
		);

		expect(getActiveClusters(
			app,
			store
		).map((cluster) => cluster.id)).toEqual([
			'one',
			'two'
		]);
	});

	it('returns nothing when the active tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addNonFileTab(
				app,
				{}
			)
		);

		expect(getActiveClusters(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] }))
		)).toEqual([]);
	});

	it('returns nothing when there is no active tab', () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			null
		);

		expect(getActiveClusters(
			app,
			buildStoreWith(buildCluster())
		)).toEqual([]);
	});
});

describe('pairWithConfirmation', () => {
	it('pairs two unpaired Clusters without asking', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' })
		);
		const {
			prompt,
			spy
		} = confirmingNothing();

		pairWithConfirmation(
			store,
			prompt,
			'a',
			'b'
		);

		expect([
			store.get().clusters['a'].pairedWith,
			store.get().clusters['b'].pairedWith,
			spy.mock.calls.length
		]).toEqual([
			'b',
			'a',
			0
		]);
	});

	it('does nothing when they are already paired', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				pairedWith: 'b'
			}),
			buildCluster({
				id: 'b',
				pairedWith: 'a'
			})
		);
		const update = vi.spyOn(
			store,
			'update'
		);

		pairWithConfirmation(
			store,
			confirming().prompt,
			'a',
			'b'
		);

		expect(update).not.toHaveBeenCalled();
	});

	it('asks before unlinking a third Cluster, and pairs nothing until confirmed', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				name: 'X',
				pairedWith: 'c',
			}),
			buildCluster({
				id: 'b',
				name: 'Z'
			}),
			buildCluster({
				id: 'c',
				name: 'Y',
				pairedWith: 'a',
			})
		);
		const {
			prompt,
			spy
		} = confirmingNothing();

		pairWithConfirmation(
			store,
			prompt,
			'a',
			'b'
		);

		expect([
			spy.mock.calls[0][1],
			store.get().clusters['a'].pairedWith
		]).toEqual([
			'X is paired with Y. Pairing it with Z unlinks Y.',
			'c'
		]);
	});

	it('unlinks the third Cluster once confirmed', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				pairedWith: 'c'
			}),
			buildCluster({ id: 'b' }),
			buildCluster({
				id: 'c',
				pairedWith: 'a'
			})
		);

		pairWithConfirmation(
			store,
			confirming().prompt,
			'a',
			'b'
		);

		expect([
			store.get().clusters['a'].pairedWith,
			store.get().clusters['b'].pairedWith,
			store.get().clusters['c'].pairedWith
		]).toEqual([
			'b',
			'a',
			null
		]);
	});

	it('does nothing when a Cluster does not exist', () => {
		const store = buildStoreWith(buildCluster({ id: 'a' }));
		const update = vi.spyOn(
			store,
			'update'
		);

		pairWithConfirmation(
			store,
			confirming().prompt,
			'a',
			'gone'
		);

		expect(update).not.toHaveBeenCalled();
	});
});

describe('promptAndPair', () => {
	it('offers every Cluster but the source', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' }),
			buildCluster({ id: 'c' })
		);
		const {
			prompt,
			spy
		} = choosingNothing();

		promptAndPair(
			store,
			prompt,
			confirming().prompt,
			'a'
		);

		expect((spy.mock.calls[0][0] as { id: string }[]).map((cluster) => cluster.id)).toEqual([
			'b',
			'c'
		]);
	});

	it('pairs the source with the chosen Cluster', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' })
		);

		promptAndPair(
			store,
			choosing('b').prompt,
			confirming().prompt,
			'a'
		);

		expect(store.get().clusters['a'].pairedWith).toBe('b');
	});

	it('pairs nothing when the prompt is cancelled', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'a' }),
			buildCluster({ id: 'b' })
		);

		promptAndPair(
			store,
			choosingNothing().prompt,
			confirming().prompt,
			'a'
		);

		expect(store.get().clusters['a'].pairedWith).toBeNull();
	});

	it('does not prompt when there is no other Cluster', () => {
		const store = buildStoreWith(buildCluster({ id: 'a' }));
		const {
			prompt,
			spy
		} = choosingNothing();

		promptAndPair(
			store,
			prompt,
			confirming().prompt,
			'a'
		);

		expect(spy).not.toHaveBeenCalled();
	});
});

describe('promptAndUnlink', () => {
	it('asks for confirmation naming both Clusters when one candidate is paired', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				name: 'X',
				pairedWith: 'b',
			}),
			buildCluster({
				id: 'b',
				name: 'Y',
				pairedWith: 'a',
			})
		);
		const {
			prompt,
			spy
		} = confirmingNothing();

		promptAndUnlink(
			store,
			choosingNothing().prompt,
			prompt,
			[store.get().clusters['a']]
		);

		expect(spy.mock.calls[0][1]).toBe('Unlink X from Y?');
	});

	it('unlinks both once confirmed', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				pairedWith: 'b'
			}),
			buildCluster({
				id: 'b',
				pairedWith: 'a'
			})
		);

		promptAndUnlink(
			store,
			choosingNothing().prompt,
			confirming().prompt,
			[store.get().clusters['a']]
		);

		expect([
			store.get().clusters['a'].pairedWith,
			store.get().clusters['b'].pairedWith
		]).toEqual([
			null,
			null
		]);
	});

	it('unlinks nothing when the confirmation is declined', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				pairedWith: 'b'
			}),
			buildCluster({
				id: 'b',
				pairedWith: 'a'
			})
		);

		promptAndUnlink(
			store,
			choosingNothing().prompt,
			confirmingNothing().prompt,
			[store.get().clusters['a']]
		);

		expect(store.get().clusters['a'].pairedWith).toBe('b');
	});

	it('asks which only among the paired candidates when several are paired', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				pairedWith: 'b'
			}),
			buildCluster({
				id: 'b',
				pairedWith: 'a'
			}),
			buildCluster({ id: 'c' }),
			buildCluster({
				id: 'd',
				pairedWith: 'e'
			}),
			buildCluster({
				id: 'e',
				pairedWith: 'd'
			})
		);
		const {
			prompt,
			spy
		} = choosingNothing();
		const { clusters } = store.get();

		promptAndUnlink(
			store,
			prompt,
			confirming().prompt,
			[
				clusters['a'],
				clusters['c'],
				clusters['d']
			]
		);

		expect((spy.mock.calls[0][0] as { id: string }[]).map((cluster) => cluster.id)).toEqual([
			'a',
			'd'
		]);
	});

	it('confirms after the choice is made', () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				name: 'M',
				pairedWith: 'b',
			}),
			buildCluster({
				id: 'b',
				name: 'N',
				pairedWith: 'a',
			}),
			buildCluster({
				id: 'd',
				name: 'P',
				pairedWith: 'e',
			}),
			buildCluster({
				id: 'e',
				name: 'Q',
				pairedWith: 'd',
			})
		);
		const {
			prompt,
			spy
		} = confirmingNothing();
		const { clusters } = store.get();

		promptAndUnlink(
			store,
			choosing('d').prompt,
			prompt,
			[
				clusters['a'],
				clusters['d']
			]
		);

		expect(spy.mock.calls[0][1]).toBe('Unlink P from Q?');
	});

	it('does nothing when no candidate is paired', () => {
		const store = buildStoreWith(buildCluster({ id: 'a' }));
		const {
			prompt,
			spy
		} = confirmingNothing();

		promptAndUnlink(
			store,
			choosingNothing().prompt,
			prompt,
			[store.get().clusters['a']]
		);

		expect(spy).not.toHaveBeenCalled();
	});
});

describe('unlinkCluster', () => {
	it('unlinks the Cluster and its partner', async () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'a',
				pairedWith: 'b'
			}),
			buildCluster({
				id: 'b',
				pairedWith: 'a'
			})
		);

		const result = await unlinkCluster(
			store,
			'b'
		);

		expect([
			result,
			store.get().clusters['a'].pairedWith,
			store.get().clusters['b'].pairedWith
		]).toEqual([
			true,
			null,
			null
		]);
	});

	it('saves nothing when the Cluster is not paired', async () => {
		const store = buildStoreWith(buildCluster({ id: 'a' }));
		const update = vi.spyOn(
			store,
			'update'
		);

		const result = await unlinkCluster(
			store,
			'a'
		);

		expect([
			result,
			update.mock.calls.length
		]).toEqual([
			false,
			0
		]);
	});
});