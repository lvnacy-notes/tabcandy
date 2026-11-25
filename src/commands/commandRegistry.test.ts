/** @file Tests for the command registry. */
/// <reference types="vite/client" />
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildCommands } from './commandRegistry';
import ReadingCompanion from '../obsidian/ReadingCompanion';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	cancelling,
	choosingNothing,
	confirmingNothing,
	pairingNothing,
	selectingNothing
} from '../test/clusterHelpers';
import { buildStore } from '../test/fakes';

describe('buildCommands', () => {
	/**
	 * Builds the commands over fakes.
	 *
	 * @returns The commands.
	 */
	function build(): ReturnType<typeof buildCommands> {
		const app = createFakeWorkspaceApp();
		const settingsStore = buildStore();

		return buildCommands({
			app,
			settingsStore,
			promptForCluster: cancelling().prompt,
			promptForClusterChoice: choosingNothing().prompt,
			promptForClusterPair: pairingNothing().prompt,
			promptForClusterRemoval: selectingNothing().prompt,
			promptForConfirmation: confirmingNothing().prompt,
			readingCompanion: new ReadingCompanion(
				app,
				settingsStore
			),
		});
	}

	it('builds every command with its stable id', () => {
		const ids = build().map((command) => command.id).sort();

		expect(ids).toEqual([
			'add-to-cluster',
			'add-to-most-recent-cluster',
			'clear-reading-companion',
			'close-cluster',
			'close-duplicate-tabs',
			'close-other-tabs',
			'close-tabs-in-folder',
			'create-cluster',
			'create-cluster-from-active-pane',
			'create-cluster-from-active-tab',
			'delete-cluster',
			'edit-cluster',
			'next-tab-across-groups',
			'open-cluster',
			'open-cluster-sidebar',
			'open-tab-candy',
			'pair-cluster-with',
			'pair-clusters',
			'previous-tab-across-groups',
			'remove-from-cluster',
			'reopen-closed-tab',
			'search-open-tabs',
			'set-reading-companion',
			'unlink-clusters',
		]);
	});

	it('registers every command module in this folder', () => {
		const modules = Object.keys(import.meta.glob(
			[
				'./*.ts',
				'!./*.test.ts',
				'!./commandRegistry.ts'
			],
			{ eager: false }
		)).length;

		expect(build()).toHaveLength(modules);
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