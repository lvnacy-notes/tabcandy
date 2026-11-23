/** @file Tests for the pair-cluster-with command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './pairClusterWith';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith,
	choosing,
	choosingNothing,
	confirming,
	isAvailable
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';

describe('pair-cluster-with command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			createFakeWorkspaceApp(),
			buildStore(),
			choosingNothing().prompt,
			confirming().prompt
		);

		expect([
			command.id,
			command.name
		]).toEqual([
			'pair-cluster-with',
			'Pair cluster with…'
		]);
	});

	it('is available when a Cluster holds the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			choosingNothing().prompt,
			confirming().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when no Cluster holds the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['other.md'] })),
			choosingNothing().prompt,
			confirming().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('is unavailable when the most recent tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addNonFileTab(
				app,
				{}
			)
		);
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			choosingNothing().prompt,
			confirming().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('does not prompt when only checking availability', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);
		const {
			prompt,
			spy
		} = choosingNothing();
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			prompt,
			confirming().prompt
		);

		isAvailable(command);

		expect(spy).not.toHaveBeenCalled();
	});

	it('pairs the only Cluster holding the file with the chosen one', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(
			app,
			'a.md',
			{}
		));
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({ id: 'two' })
		);
		const command = buildInvokeCommand(
			app,
			store,
			choosing('two').prompt,
			confirming().prompt
		);

		command.checkCallback?.(false);

		expect([
			store.get().clusters['one'].pairedWith,
			store.get().clusters['two'].pairedWith
		]).toEqual([
			'two',
			'one'
		]);
	});

	it('asks which Cluster first when several hold the file', async () => {
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
			buildCluster({ id: 'three' })
		);
		const {
			prompt,
			spy
		} = choosingNothing();
		const command = buildInvokeCommand(
			app,
			store,
			prompt,
			confirming().prompt
		);

		command.checkCallback?.(false);

		expect((spy.mock.calls[0][0] as { id: string }[]).map((cluster) => cluster.id)).toEqual([
			'one',
			'two'
		]);
	});
});