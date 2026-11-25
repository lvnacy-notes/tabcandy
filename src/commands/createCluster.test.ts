/** @file Tests for the create-cluster command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './createCluster';
import {
	cancelling,
	submitting
} from '../test/clusterHelpers';
import { buildStore } from '../test/fakes';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import { buildDependencies } from '../test/dependencyHelpers';

describe('create-cluster command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStore(),
			{ promptForCluster: cancelling().prompt }
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'create-cluster',
			'Create cluster'
		]);
	});

	it('creates an empty Cluster from the submitted details', () => {
		const store = buildStore();
		const command = buildInvokeCommand(buildDependencies(createFakeWorkspaceApp(), store, { promptForCluster: submitting({
			name: 'Blank',
			flavor: '#00ff00'
		}).prompt }));

		command.callback?.();

		const [created] = Object.values(store.get().clusters);
		expect(created.name).toBe('Blank');
		expect(created.flavor).toBe('#00ff00');
		expect(created.members).toEqual([]);
	});

	it('creates nothing when the prompt is cancelled', () => {
		const store = buildStore();
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			store,
			{ promptForCluster: cancelling().prompt }
		));

		command.callback?.();

		expect(store.get().clusters).toEqual({});
	});
});