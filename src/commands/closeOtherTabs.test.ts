/** @file Tests for the close-other-tabs command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './closeOtherTabs';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import { createFakeLeaf } from '../test/FakeWorkspaceLeaf';
import { collectRootLeaves } from '../test/commandHelpers';

describe('close-other-tabs command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(createFakeWorkspaceApp());

		expect([command.id, command.name]).toEqual(['close-other-tabs', 'Close all tabs except this one']);
	});

	it('closes every tab except the current one', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const current = createFakeLeaf(app);
		addRootLeaf(app, current);
		addRootLeaf(app, createFakeLeaf(app));
		setMostRecentLeaf(app, current);

		buildInvokeCommand(app).callback?.();

		expect(collectRootLeaves(app)).toEqual([current]);
	});
});