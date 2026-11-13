/** @file Tests for the add-to-most-recent-cluster command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './addToMostRecentCluster';
import { createFakeWorkspaceApp, setMostRecentLeaf } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	buildStoreWith,
	isAvailable
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';

describe('add-to-most-recent-cluster command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(createFakeWorkspaceApp(), buildStore());

		expect([command.id, command.name]).toEqual(['add-to-most-recent-cluster', 'Add to most recent cluster']);
	});

	it('is available when the most recent tab is file-backed and a Cluster exists', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(app, buildStoreWith(buildCluster()));

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when there are no Clusters', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(app, buildStore());

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('is unavailable when the most recent tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addNonFileTab(app, {}));
		const command = buildInvokeCommand(app, buildStoreWith(buildCluster()));

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('does not add anything when only checking availability', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const store = buildStoreWith(buildCluster());
		const command = buildInvokeCommand(app, store);

		isAvailable(command);

		expect(store.get().clusters['cluster-a'].members).toEqual([]);
	});

	it('adds the active tab\'s file to the Cluster with the highest lastTouchedAt', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const store = buildStoreWith(
			buildCluster({ id: 'old', lastTouchedAt: 1 }),
			buildCluster({ id: 'new', lastTouchedAt: 9 })
		);
		const command = buildInvokeCommand(app, store);

		command.checkCallback?.(false);

		expect(store.get().clusters['new'].members).toEqual(['a.md']);
	});
});