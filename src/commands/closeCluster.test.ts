/** @file Tests for the close-cluster command. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './closeCluster';
import { closeCluster } from '../obsidian/clusterOpenClose';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
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

vi.mock('../obsidian/clusterOpenClose', async (importOriginal) => ({
	...await importOriginal<typeof import('../obsidian/clusterOpenClose')>(),
	closeCluster: vi.fn(),
}));

describe('close-cluster command', () => {
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
			'close-cluster',
			'Close cluster'
		]);
	});

	it('is available when a Cluster has an open member', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		const command = buildInvokeCommand(buildDependencies(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			{ promptForClusterChoice: choosingNothing().prompt }
		));

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when no Cluster has an open member', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'other.md',
			{}
		);
		const command = buildInvokeCommand(buildDependencies(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			{ promptForClusterChoice: choosingNothing().prompt }
		));

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('offers only the Clusters with an open member', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		const {
			prompt,
			spy
		} = choosingNothing();
		const command = buildInvokeCommand(buildDependencies(app, buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['b.md']
			})
		), { promptForClusterChoice: prompt }));

		command.checkCallback?.(false);

		expect((spy.mock.calls[0][0] as { id: string }[]).map((cluster) => cluster.id)).toEqual(['one']);
	});

	it('closes the chosen Cluster', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md']
		}));
		const command = buildInvokeCommand(buildDependencies(
			app,
			store,
			{ promptForClusterChoice: choosing('one').prompt }
		));

		command.checkCallback?.(false);

		expect(closeCluster).toHaveBeenCalledWith(
			app,
			store,
			'one'
		);
	});
});