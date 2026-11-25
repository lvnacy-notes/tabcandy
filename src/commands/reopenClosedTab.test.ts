/** @file Tests for the reopen-closed-tab command. */
import {
	beforeEach,
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './reopenClosedTab';
import {
	closeLeaves,
	getClosedTabs,
	registerTabTracking,
	resetTabTrackingState
} from '../tabs/tabNavigation';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setLayoutReady
} from '../test/FakeWorkspace';
import { createFakeLeaf } from '../test/FakeWorkspaceLeaf';
import { collectRootLeaves } from '../test/commandHelpers';
import { buildStore } from '../test/fakes';
import { buildDependencies } from '../test/dependencyHelpers';

beforeEach(() => {
	resetTabTrackingState();
});

describe('reopen-closed-tab command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStore()
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'reopen-closed-tab',
			'Reopen closed tab'
		]);
	});

	it('reopens the most recently closed tab', async () => {
		const app = createFakeWorkspaceApp({ files: { 'A.md': '' } });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' }
		});
		addRootLeaf(
			app,
			leaf
		);
		registerTabTracking(
			app,
			() => {}
		);
		setLayoutReady(app);
		closeLeaves(
			app,
			() => true,
			true
		);
		app.workspace.trigger('layout-change');

		buildInvokeCommand(buildDependencies(
			app, 
			buildStore()
		)).callback?.();

		expect(getClosedTabs()).toEqual([]);
		expect(collectRootLeaves(app)).toHaveLength(1);
	});
});