/** @file Tests for the pair-clusters command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './pairClusters';
import {
	buildStoreWith,
	confirming,
	confirmingNothing,
	pairing,
	pairingNothing
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';

describe('pair-clusters command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			buildStore(),
			pairingNothing().prompt,
			confirming().prompt
		);

		expect([
			command.id,
			command.name
		]).toEqual([
			'pair-clusters',
			'Pair clusters…'
		]);
	});

	it('is always available', () => {
		const command = buildInvokeCommand(
			buildStore(),
			pairingNothing().prompt,
			confirming().prompt
		);

		expect(command.callback).toBeDefined();
		expect(command.checkCallback).toBeUndefined();
	});

	it('offers every Cluster to the prompt', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);
		const {
			prompt,
			spy
		} = pairingNothing();
		const command = buildInvokeCommand(
			store,
			prompt,
			confirming().prompt
		);

		command.callback?.();

		expect((spy.mock.calls[0][0] as { id: string }[]).map((cluster) => cluster.id)).toEqual([
			'one',
			'two'
		]);
	});

	it('pairs the two Clusters the prompt submits', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);
		const command = buildInvokeCommand(
			store,
			pairing(
				'one',
				'two'
			).prompt,
			confirming().prompt
		);

		command.callback?.();

		expect([
			store.get().clusters['one'].pairedWith,
			store.get().clusters['two'].pairedWith
		]).toEqual([
			'two',
			'one'
		]);
	});

	it('pairs nothing when the prompt is cancelled', () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);
		const command = buildInvokeCommand(
			store,
			pairingNothing().prompt,
			confirming().prompt
		);

		command.callback?.();

		expect(store.get().clusters['one'].pairedWith).toBeNull();
	});

	it('does not prompt with fewer than two Clusters', () => {
		const {
			prompt,
			spy
		} = pairingNothing();
		const command = buildInvokeCommand(
			buildStoreWith(buildCluster({ id: 'one' })),
			prompt,
			confirmingNothing().prompt
		);

		command.callback?.();

		expect(spy).not.toHaveBeenCalled();
	});
});