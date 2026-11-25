/** @file Tests for the clear-reading-companion command. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildInvokeCommand } from './clearReadingCompanion';
import ReadingCompanion from '../obsidian/ReadingCompanion';
import { buildDependencies } from '../test/dependencyHelpers';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
	buildStoreWith,
	isAvailable
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';

describe('clear-reading-companion command', () => {
	/**
	 * Builds a companion with no tab set.
	 *
	 * @returns The app and companion.
	 */
	function setUp() {
		const app = createFakeWorkspaceApp();
		const store = buildStoreWith(buildCluster());
		const readingCompanion = new ReadingCompanion(
			app,
			store
		);

		return {
			app,
			readingCompanion,
			store
		};
	}

	it('has its id and name', () => {
		const {
			app,
			readingCompanion,
			store
		} = setUp();

		const command = buildInvokeCommand(buildDependencies(
			app, 
			store, 
			{ readingCompanion }
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'clear-reading-companion',
			'Clear reading companion'
		]);
	});

	it('is unavailable while no companion is set', () => {
		const {
			app,
			readingCompanion,
			store
		} = setUp();

		const result = isAvailable(buildInvokeCommand(buildDependencies(
			app, 
			store, 
			{ readingCompanion }
		)));

		expect(result).toBe(false);
	});

	it('is available while a companion is set, and clears it', async () => {
		const {
			app,
			readingCompanion,
			store
		} = setUp();
		await readingCompanion.set(
			await addFileTab(
				app,
				'a.md',
				{}
			),
			'cluster-a'
		);
		const command = buildInvokeCommand(buildDependencies(
			app, 
			store, 
			{ readingCompanion }
		));

		const available = isAvailable(command);
		command.checkCallback?.(false);

		expect(available).toBe(true);
		expect(readingCompanion.isSet()).toBe(false);
	});
});