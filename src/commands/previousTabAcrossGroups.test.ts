/** @file Tests for the previous-tab-across-groups command. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './previousTabAcrossGroups';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import { createFakeLeaf } from '../test/FakeWorkspaceLeaf';

describe('previous-tab-across-groups command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(createFakeWorkspaceApp());

		expect([command.id, command.name]).toEqual(['previous-tab-across-groups', 'Go to previous tab across groups']);
	});

	it('focuses the previous tab, wrapping past the first tab', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const first = createFakeLeaf(app);
		addRootLeaf(app, first);
		const second = createFakeLeaf(app);
		addRootLeaf(app, second);
		setMostRecentLeaf(app, first);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		buildInvokeCommand(app).callback?.();

		expect(setActiveLeaf).toHaveBeenCalledWith(second, { focus: true });
	});
});