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
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import { buildDependencies } from '../test/dependencyHelpers';

describe('pair-clusters command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStore(),
			{ 
				promptForClusterPair: pairingNothing().prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'pair-clusters',
			'Pair clusters…'
		]);
	});

	it('is always available', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStore(),
			{ 
				promptForClusterPair: pairingNothing().prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

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
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			store,
			{ 
				promptForClusterPair: prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

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
		const command = buildInvokeCommand(buildDependencies(createFakeWorkspaceApp(), store, { promptForClusterPair: pairing(
			'one',
			'two'
		).prompt, promptForConfirmation: confirming().prompt }));

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
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			store,
			{ 
				promptForClusterPair: pairingNothing().prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

		command.callback?.();

		expect(store.get().clusters['one'].pairedWith).toBeNull();
	});

	it('does not prompt with fewer than two Clusters', () => {
		const {
			prompt,
			spy
		} = pairingNothing();
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStoreWith(buildCluster({ id: 'one' })),
			{ 
				promptForClusterPair: prompt, 
				promptForConfirmation: confirmingNothing().prompt 
			}
		));

		command.callback?.();

		expect(spy).not.toHaveBeenCalled();
	});
});