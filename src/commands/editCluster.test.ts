/** @file Tests for the edit-cluster command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './editCluster';
import {
	buildStoreWith,
	cancelling,
	choosing,
	choosingNothing,
	isAvailable
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import { buildDependencies } from '../test/dependencyHelpers';

describe('edit-cluster command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStoreWith(),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForCluster: cancelling().prompt 
			}
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'edit-cluster',
			'Edit cluster'
		]);
	});

	it('is available when a Cluster exists', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStoreWith(buildCluster()),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForCluster: cancelling().prompt 
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
				promptForCluster: cancelling().prompt 
			}
		));

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('opens the details form for the chosen Cluster, filled in', () => {
		const {
			prompt,
			spy
		} = cancelling();
		const command = buildInvokeCommand(buildDependencies(createFakeWorkspaceApp(), buildStoreWith(
			buildCluster({
				id: 'one',
				name: 'First'
			}),
			buildCluster({
				id: 'two',
				name: 'Second',
				flavor: '#ff0000'
			})
		), { 
			promptForClusterChoice: choosing('two').prompt, 
			promptForCluster: prompt 
		}));

		command.checkCallback?.(false);

		expect(spy.mock.calls[0][1]).toEqual({
			name: 'Second',
			flavor: '#ff0000'
		});
	});
});