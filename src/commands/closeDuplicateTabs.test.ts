/** @file Tests for the close-duplicate-tabs command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './closeDuplicateTabs';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import { createFakeLeaf } from '../test/FakeWorkspaceLeaf';
import { collectRootLeaves } from '../test/commandHelpers';

describe('close-duplicate-tabs command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(createFakeWorkspaceApp());

		expect([command.id, command.name]).toEqual(['close-duplicate-tabs', 'Close duplicate tabs']);
	});

	it('closes a tab showing a file that a pinned tab already shows', async () => {
		const app = createFakeWorkspaceApp({ files: { 'A.md': '' } });
		const pinned = createFakeLeaf(app);
		await pinned.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			pinned: true,
		});
		addRootLeaf(app, pinned);
		const duplicate = createFakeLeaf(app);
		await duplicate.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, duplicate);
		setMostRecentLeaf(app, duplicate);

		buildInvokeCommand(app).callback?.();

		expect(collectRootLeaves(app)).toEqual([pinned]);
	});
});