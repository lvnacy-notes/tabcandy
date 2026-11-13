/** @file Tests for the remove-from-cluster command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './removeFromCluster';
import { createFakeWorkspaceApp, setMostRecentLeaf } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	buildStoreWith,
	isAvailable,
	selecting,
	selectingNothing
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';

describe('remove-from-cluster command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			createFakeWorkspaceApp(),
			buildStore(),
			selectingNothing().prompt
		);

		expect([command.id, command.name]).toEqual(['remove-from-cluster', 'Remove from cluster']);
	});

	it('is available when a Cluster holds the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			selectingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when no Cluster holds the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['other.md'] })),
			selectingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('is unavailable when the most recent tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addNonFileTab(app, {}));
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster({ members: ['a.md'] })),
			selectingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('does not remove anything when only checking availability', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const store = buildStoreWith(buildCluster({ members: ['a.md'] }));
		const command = buildInvokeCommand(
			app,
			store,
			selectingNothing().prompt
		);

		isAvailable(command);

		expect(store.get().clusters['cluster-a'].members).toEqual(['a.md']);
	});

	it('removes the file from the only Cluster holding it', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const store = buildStoreWith(buildCluster({ members: ['a.md'] }));
		const command = buildInvokeCommand(
			app,
			store,
			selectingNothing().prompt
		);

		command.checkCallback?.(false);

		expect(store.get().clusters['cluster-a'].members).toEqual([]);
	});

	it('removes the file from the Clusters the prompt selects when several hold it', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);
		const command = buildInvokeCommand(
			app,
			store,
			selecting(['one']).prompt
		);

		command.checkCallback?.(false);

		expect([store.get().clusters['one'].members, store.get().clusters['two'].members]).toEqual([[], ['a.md']]);
	});
});