/** @file Tests for the create-cluster-from-active-pane command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './createClusterFromActivePane';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	cancelling,
	isAvailable,
	submitting
} from '../test/clusterHelpers';

describe('create-cluster-from-active-pane command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			createFakeWorkspaceApp(),
			buildStore(),
			cancelling().prompt
		);

		expect([command.id, command.name]).toEqual(['create-cluster-from-active-pane', 'Create cluster from active pane']);
	});

	it('is available when the most recent tab\'s pane has file-backed tabs', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(
			app,
			buildStore(),
			cancelling().prompt
		);

		expect(isAvailable(command)).toBe(true);
	});

	it('is available when the most recent tab has no file but its pane does', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'a.md', pane);
		setMostRecentLeaf(app, await addNonFileTab(app, pane));
		const command = buildInvokeCommand(
			app,
			buildStore(),
			cancelling().prompt
		);

		expect(isAvailable(command)).toBe(true);
	});

	it('is unavailable when no tab in the pane has a file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addNonFileTab(app, {}));
		const command = buildInvokeCommand(
			app,
			buildStore(),
			cancelling().prompt
		);

		expect(isAvailable(command)).toBe(false);
	});

	it('is unavailable when there is no most recent tab', () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, null);
		const command = buildInvokeCommand(
			app,
			buildStore(),
			cancelling().prompt
		);

		expect(isAvailable(command)).toBe(false);
	});

	it('creates a Cluster holding every file in the pane, not other panes', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'one.md', pane);
		setMostRecentLeaf(app, await addFileTab(app, 'two.md', pane));
		await addFileTab(app, 'elsewhere.md', {});
		const store = buildStore();
		const command = buildInvokeCommand(
			app,
			store,
			submitting({ name: 'Pane' }).prompt
		);

		command.checkCallback?.(false);

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['one.md', 'two.md']);
	});

	it('collapses a file open in two tabs of the pane to one member', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'same.md', pane);
		setMostRecentLeaf(app, await addFileTab(app, 'same.md', pane));
		const store = buildStore();
		const command = buildInvokeCommand(
			app,
			store,
			submitting({ name: 'Pane' }).prompt
		);

		command.checkCallback?.(false);

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['same.md']);
	});
});