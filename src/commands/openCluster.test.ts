/** @file Tests for the open-cluster command. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './openCluster';
import { openCluster } from '../obsidian/clusterOpenClose';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	buildStoreWith,
	choosing,
	choosingNothing,
	isAvailable
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';
import { buildDependencies } from '../test/dependencyHelpers';

vi.mock(
	'../obsidian/clusterOpenClose',
	() => ({ openCluster: vi.fn() })
);

describe('open-cluster command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(),
			buildStore(),
			{ promptForClusterChoice: choosingNothing().prompt }
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'open-cluster',
			'Open cluster'
		]);
	});

	it('is available when a Cluster exists', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(),
			buildStoreWith(buildCluster()),
			{ promptForClusterChoice: choosingNothing().prompt }
		));

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when there are no Clusters', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(),
			buildStoreWith(),
			{ promptForClusterChoice: choosingNothing().prompt }
		));

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('does not prompt when only checking availability', () => {
		const {
			prompt,
			spy
		} = choosingNothing();
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(),
			buildStoreWith(buildCluster()),
			{ promptForClusterChoice: prompt }
		));

		isAvailable(command);

		expect(spy).not.toHaveBeenCalled();
	});

	it('offers every Cluster to the prompt', () => {
		const {
			prompt,
			spy
		} = choosingNothing();
		const command = buildInvokeCommand(buildDependencies(createFakeWorkspaceApp(), buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		), { promptForClusterChoice: prompt }));

		command.checkCallback?.(false);

		expect((spy.mock.calls[0][0] as { id: string }[]).map((cluster) => cluster.id)).toEqual([
			'one',
			'two'
		]);
	});

	it('opens the chosen Cluster', () => {
		const app = createFakeWorkspaceApp();
		const store = buildStoreWith(
			buildCluster({ id: 'one' }),
			buildCluster({ id: 'two' })
		);
		const command = buildInvokeCommand(buildDependencies(
			app,
			store,
			{ promptForClusterChoice: choosing('two').prompt }
		));

		command.checkCallback?.(false);

		expect(openCluster).toHaveBeenCalledWith(
			app,
			store,
			'two'
		);
	});
});