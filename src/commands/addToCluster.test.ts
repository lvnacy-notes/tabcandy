/** @file Tests for the add-to-cluster command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './addToCluster';
import { createFakeWorkspaceApp, setMostRecentLeaf } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	buildStoreWith,
	choosing,
	choosingNothing,
	isAvailable
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';

describe('add-to-cluster command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			createFakeWorkspaceApp(),
			buildStore(),
			choosingNothing().prompt
		);

		expect([command.id, command.name]).toEqual(['add-to-cluster', 'Add to cluster']);
	});

	it('is available when the most recent tab is file-backed and a Cluster exists', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster()),
			choosingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when there are no Clusters', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(
			app,
			buildStore(),
			choosingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('is unavailable when the most recent tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addNonFileTab(app, {}));
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster()),
			choosingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('does not prompt when only checking availability', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const { prompt, spy } = choosingNothing();
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster()),
			prompt
		);

		isAvailable(command);

		expect(spy).not.toHaveBeenCalled();
	});

	it('adds the active tab\'s file to the chosen Cluster', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		const command = buildInvokeCommand(
			app,
			store,
			choosing('one').prompt
		);

		command.checkCallback?.(false);

		expect(store.get().clusters['one'].members).toEqual(['a.md']);
	});
});