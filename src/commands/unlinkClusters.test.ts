/** @file Tests for the unlink-clusters command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './unlinkClusters';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	addFileTab,
	buildStoreWith,
	choosingNothing,
	confirming,
	confirmingNothing,
	isAvailable
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';
import { buildDependencies } from '../test/dependencyHelpers';

describe('unlink-clusters command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(),
			buildStore(),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'unlink-clusters',
			'Unlink clusters'
		]);
	});

	it('is available when a paired Cluster holds the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);
		const command = buildInvokeCommand(buildDependencies(app, buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md'],
				pairedWith: 'two'
			}),
			buildCluster({
				id: 'two',
				pairedWith: 'one'
			})
		), {
			promptForClusterChoice: choosingNothing().prompt, 
			promptForConfirmation: confirming().prompt 
		}));

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when the Cluster holding the file is not paired', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);
		const command = buildInvokeCommand(buildDependencies(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('does not ask for confirmation when only checking availability', async () => {
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
		} = confirmingNothing();
		const command = buildInvokeCommand(buildDependencies(app, buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md'],
				pairedWith: 'two'
			}),
			buildCluster({
				id: 'two',
				pairedWith: 'one'
			})
		), { 
			promptForClusterChoice: choosingNothing().prompt, 
			promptForConfirmation: prompt 
		}));

		isAvailable(command);

		expect(spy).not.toHaveBeenCalled();
	});

	it('unlinks the Clusters once confirmed', async () => {
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
				members: ['a.md'],
				pairedWith: 'two'
			}),
			buildCluster({
				id: 'two',
				pairedWith: 'one'
			})
		);
		const command = buildInvokeCommand(buildDependencies(
			app,
			store,
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirming().prompt 
			}
		));

		command.checkCallback?.(false);

		expect([
			store.get().clusters['one'].pairedWith,
			store.get().clusters['two'].pairedWith
		]).toEqual([
			null,
			null
		]);
	});

	it('keeps the Pairing when the confirmation is declined', async () => {
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
				members: ['a.md'],
				pairedWith: 'two'
			}),
			buildCluster({
				id: 'two',
				pairedWith: 'one'
			})
		);
		const command = buildInvokeCommand(buildDependencies(
			app,
			store,
			{ 
				promptForClusterChoice: choosingNothing().prompt, 
				promptForConfirmation: confirmingNothing().prompt 
			}
		));

		command.checkCallback?.(false);

		expect(store.get().clusters['one'].pairedWith).toBe('two');
	});
});