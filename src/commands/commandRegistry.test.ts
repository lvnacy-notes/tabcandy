/** @file Tests for the command registry. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildCommands } from './commandRegistry';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	buildStore,
	cancelling,
	choosingNothing,
	selectingNothing
} from '../test/clusterHelpers';

describe('buildCommands', () => {
	/**
	 * Builds the commands over fakes.
	 *
	 * @returns The commands.
	 */
	function build(): ReturnType<typeof buildCommands> {
		return buildCommands({
			app: createFakeWorkspaceApp(),
			settingsStore: buildStore(),
			promptForCluster: cancelling().prompt,
			promptForClusterChoice: choosingNothing().prompt,
			promptForClusterRemoval: selectingNothing().prompt,
		});
	}

	it('builds every command with its stable id', () => {
		const ids = build().map((command) => command.id).sort();

		expect(ids).toEqual([
			'add-to-cluster',
			'add-to-most-recent-cluster',
			'close-duplicate-tabs',
			'close-other-tabs',
			'close-tabs-in-folder',
			'create-cluster',
			'create-cluster-from-active-pane',
			'create-cluster-from-active-tab',
			'next-tab-across-groups',
			'open-tab-candy',
			'previous-tab-across-groups',
			'remove-from-cluster',
			'reopen-closed-tab',
			'search-open-tabs',
		]);
	});

	it('gives every command a distinct id', () => {
		const ids = build().map((command) => command.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('gives every command a name', () => {
		const names = build().map((command) => command.name);

		expect(names.every((name) => name.length > 0)).toBe(true);
	});
});