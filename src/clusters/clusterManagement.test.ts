/** @file Tests for editing and deleting Clusters. */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	promptAndDelete,
	promptAndEdit
} from './clusterManagement';
import {
	buildStoreWith,
	cancelling,
	confirming,
	confirmingNothing
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import type {
	ClusterDraft,
	PromptForCluster
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