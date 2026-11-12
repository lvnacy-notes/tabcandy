/** @file Tests for the create-cluster-from-active-tab command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './createClusterFromActiveTab';
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

describe('create-cluster-from-active-tab command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			createFakeWorkspaceApp(),
			buildStore(),
			cancelling().prompt
		);

		expect([command.id, command.name]).toEqual(['create-cluster-from-active-tab', 'Create cluster from active tab']);
	});

	it('is available when the most recent tab is file-backed', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const command = buildInvokeCommand(
			app,
			buildStore(),
			cancelling().prompt
		);

		expect(isAvailable(command)).toBe(true);
	});

	it('is unavailable when the most recent tab has no file', async () => {
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

	it('does not prompt when only checking availability', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(app, await addFileTab(app, 'a.md', {}));
		const { prompt, spy } = cancelling();
		const command = buildInvokeCommand(
			app,
			buildStore(),
			prompt
		);

		isAvailable(command);

		expect(spy).not.toHaveBeenCalled();
	});

	it('creates a Cluster holding only the active tab\'s file', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'sibling.md', pane);
		setMostRecentLeaf(app, await addFileTab(app, 'active.md', pane));
		const store = buildStore();
		const command = buildInvokeCommand(
			app,
			store,
			submitting({ name: 'One' }).prompt
		);

		command.checkCallback?.(false);

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['active.md']);
	});
});