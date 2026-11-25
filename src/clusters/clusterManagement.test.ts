/** @file Tests for creating, editing and deleting Clusters. */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	createClusterFromDraft,
	describeNewCluster,
	promptAndDelete,
	promptAndEdit
} from './clusterManagement';
import {
	buildStoreWith,
	cancelling,
	confirming,
	confirmingNothing
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildClusters,
	buildSettings,
	buildStore
} from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';
import {

	UNTITLED_CLUSTER_NAME,
	type ClusterDraft,
	type PromptForCluster
} from '../types';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

/**
 * A details prompt that submits `draft` immediately.
 *
 * @param draft - The details to submit.
 * @returns The prompt and a spy on it.
 */
function submitting(draft: ClusterDraft): {
	prompt: PromptForCluster;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn((onSubmit: (draft: ClusterDraft) => void) => {
		onSubmit(draft);
	});
	return {
		prompt: spy,
		spy
	};
}

describe('promptAndEdit', () => {
	it('fills the form with the Cluster\'s current name and Flavor', () => {
		const {
			prompt,
			spy
		} = cancelling();

		promptAndEdit(
			buildStoreWith(buildCluster({
				id: 'one',
				name: 'Reading',
				flavor: '#ff0000'
			})),
			prompt,
			'one'
		);

		expect(spy.mock.calls[0][1]).toEqual({
			name: 'Reading',
			flavor: '#ff0000'
		});
	});

	it('saves the submitted name and Flavor', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one' }));

		promptAndEdit(
			store,
			submitting({
				name: 'Reading',
				flavor: '#00ff00'
			}).prompt,
			'one'
		);
		await vi.runAllTimersAsync();

		expect([
			store.get().clusters['one'].name,
			store.get().clusters['one'].flavor
		]).toEqual([
			'Reading',
			'#00ff00'
		]);
	});

	it('saves nothing when the prompt is cancelled', async () => {
		const store = buildStoreWith(buildCluster({
			id: 'one',
			name: 'Original'
		}));

		promptAndEdit(
			store,
			cancelling().prompt,
			'one'
		);
		await vi.runAllTimersAsync();

		expect(store.get().clusters['one'].name).toBe('Original');
	});

});

describe('promptAndDelete', () => {
	it('asks for confirmation in the specified words', () => {
		const {
			prompt,
			spy
		} = confirmingNothing();

		promptAndDelete(
			buildStoreWith(buildCluster({
				id: 'one',
				name: 'Reading'
			})),
			prompt,
			'one'
		);

		expect(spy.mock.calls[0].slice(
			0,
			3
		)).toEqual([
			'Delete cluster \'Reading\'?',
			'Its tabs stay open. This can\'t be undone.',
			'Delete'
		]);
	});

	it('deletes the Cluster once confirmed', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one' }));

		promptAndDelete(
			store,
			confirming().prompt,
			'one'
		);
		await vi.runAllTimersAsync();

		expect(store.get().clusters['one']).toBeUndefined();
	});

	it('unpairs the partner of the deleted Cluster', async () => {
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				pairedWith: 'two'
			}),
			buildCluster({
				id: 'two',
				pairedWith: 'one'
			})
		);

		promptAndDelete(
			store,
			confirming().prompt,
			'one'
		);
		await vi.runAllTimersAsync();

		expect(store.get().clusters['two'].pairedWith).toBeNull();
	});

	it('keeps the Cluster when the confirmation is declined', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one' }));

		promptAndDelete(
			store,
			confirmingNothing().prompt,
			'one'
		);
		await vi.runAllTimersAsync();

		expect(store.get().clusters['one']).toBeDefined();
	});

});

describe('createClusterFromDraft', () => {
	it('saves a Cluster with the draft\'s name, Flavor and the given members', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{
				name: 'Research',
				flavor: '#ff8800'
			},
			[
				'a.md',
				'b.md'
			],
			500
		);

		expect(store.get().clusters[cluster.id]).toEqual({
			id: cluster.id,
			name: 'Research',
			flavor: '#ff8800',
			members: [
				'a.md',
				'b.md'
			],
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
		const store = new SettingsStore(
			buildSettings(),
			persist
		);

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
		[
			'no members',
			[],
			'Created empty Cluster "Research".'
		],
		[
			'one member',
			['a.md'],
			'Created Cluster "Research" with 1 tab.'
		],
		[
			'several members',
			[
				'a.md',
				'b.md'
			],
			'Created Cluster "Research" with 2 tabs.'
		]
	])(
		'describes a Cluster with %s',
		(
			_kind,
			members,
			expected
		) => {
			const cluster = buildCluster({
				name: 'Research',
				members
			});

			const result = describeNewCluster(cluster);

			expect(result).toBe(expected);
		}
	);
});
