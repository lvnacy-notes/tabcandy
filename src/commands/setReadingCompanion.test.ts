/** @file Tests for the set-reading-companion command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './setReadingCompanion';
import ReadingCompanion from '../obsidian/ReadingCompanion';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith,
	choosing,
	choosingNothing,
	isAvailable
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice } from '../types';

describe('set-reading-companion command', () => {
	/**
	 * Builds the command over an app whose most recent tab is `a.md`.
	 *
	 * @param store - The store.
	 * @param prompt - The Cluster prompt.
	 * @returns The command, its companion and the tab.
	 */
	async function setUp(store: SettingsStore, prompt: PromptForClusterChoice) {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		setMostRecentLeaf(
			app,
			leaf
		);
		const readingCompanion = new ReadingCompanion(
			app,
			store
		);

		return {
			app,
			leaf,
			readingCompanion,
			command: buildInvokeCommand(
				app,
				readingCompanion,
				prompt
			)
		};
	}

	it('has its id and name', async () => {
		const { command } = await setUp(
			buildStore(),
			choosingNothing().prompt
		);

		expect([
			command.id,
			command.name
		]).toEqual([
			'set-reading-companion',
			'Set reading companion'
		]);
	});

	it('is available when the active tab is file-backed and a Cluster exists', async () => {
		const { command } = await setUp(
			buildStoreWith(buildCluster()),
			choosingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(true);
	});

	it('is unavailable when there are no Clusters', async () => {
		const { command } = await setUp(
			buildStore(),
			choosingNothing().prompt
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('is unavailable when the active tab has no file', async () => {
		const { 
			app, 
			command 
		} = await setUp(
			buildStoreWith(buildCluster()),
			choosingNothing().prompt
		);
		setMostRecentLeaf(
			app,
			await addNonFileTab(
				app,
				{}
			)
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('makes the active tab the companion of the chosen Cluster', async () => {
		const {
			command,
			readingCompanion
		} = await setUp(
			buildStoreWith(buildCluster({ id: 'cluster-a' })),
			choosing('cluster-a').prompt
		);

		command.checkCallback?.(false);

		expect(readingCompanion.isSet()).toBe(true);
	});
});