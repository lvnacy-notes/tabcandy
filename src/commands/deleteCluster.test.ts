/** @file Tests for the delete-cluster command. */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './deleteCluster';
import {
	buildStoreWith,
	choosing,
	choosingNothing,
	confirming,
	confirmingNothing,
	isAvailable
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import { buildDependencies } from '../test/dependencyHelpers';

describe('delete-cluster command', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStoreWith(),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirmingNothing().prompt 
			}
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'delete-cluster',
			'Delete cluster'
		]);
	});

	it('is available when a Cluster exists', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStoreWith(buildCluster()),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirmingNothing().prompt 
			}
		));

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when there are no Clusters', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStoreWith(),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirmingNothing().prompt 
			}
		));

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('asks for confirmation about the chosen Cluster', () => {
		const {
			prompt,
			spy
		} = confirmingNothing();
		const command = buildInvokeCommand(buildDependencies(createFakeWorkspaceApp(), buildStoreWith(
			buildCluster({
				id: 'one',
				name: 'First'
			}),
			buildCluster({
				id: 'two',
				name: 'Second'
			})
		), { 
			promptForClusterChoice: choosing('two').prompt, 
			promptForConfirmation: prompt 
		}));

		command.checkCallback?.(false);

		expect(spy.mock.calls[0][0]).toBe('Delete cluster \'Second\'?');
	});

	it('deletes the chosen Cluster once confirmed', async () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			store,
			{ 
				promptForClusterChoice: choosing('two').prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

		command.checkCallback?.(false);
		await vi.runAllTimersAsync();

		expect(Object.keys(store.get().clusters)).toEqual(['one']);
	});
});