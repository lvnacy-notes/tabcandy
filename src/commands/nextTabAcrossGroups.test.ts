/** @file Tests for the next-tab-across-groups command. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './nextTabAcrossGroups';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import { createFakeLeaf } from '../test/FakeWorkspaceLeaf';
import { buildStore } from '../test/fakes';
import { buildDependencies } from '../test/dependencyHelpers';

describe('next-tab-across-groups command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createFakeWorkspaceApp(), 
			buildStore()
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'next-tab-across-groups',
			'Go to next tab across groups'
		]);
	});

	it('focuses the next tab, wrapping past the last tab', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const first = createFakeLeaf(app);
		addRootLeaf(
			app,
			first
		);
		const second = createFakeLeaf(app);
		addRootLeaf(
			app,
			second
		);
		setMostRecentLeaf(
			app,
			second
		);
		const setActiveLeaf = vi.spyOn(
			app.workspace,
			'setActiveLeaf'
		);

		buildInvokeCommand(buildDependencies(
			app, 
			buildStore()
		)).callback?.();

		expect(setActiveLeaf).toHaveBeenCalledWith(
			first,
			{ focus: true }
		);
	});
});