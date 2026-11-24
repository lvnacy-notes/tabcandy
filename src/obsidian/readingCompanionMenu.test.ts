/** @file Tests for the tab-header context menu item that sets the reading companion. */
import {
	describe,
	expect,
	it
} from 'vitest';
import ReadingCompanion from './ReadingCompanion';
import { registerReadingCompanionMenu } from './readingCompanionMenu';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith,
	choosing
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import { openFileMenu } from '../test/menuHelpers';

describe('registerReadingCompanionMenu', () => {
	/**
	 * Registers the menu over an app holding one Cluster and a file tab.
	 *
	 * @returns The app, companion and tab.
	 */
	async function setUp() {
		const app = createFakeWorkspaceApp();
		const readingCompanion = new ReadingCompanion(
			app,
			buildStoreWith(buildCluster({ id: 'cluster-a' }))
		);
		registerReadingCompanionMenu(
			app,
			readingCompanion,
			() => {},
			choosing('cluster-a').prompt
		);

		return {
			app,
			readingCompanion,
			leaf: await addFileTab(
				app,
				'a.md',
				{}
			)
		};
	}

	it('adds Set reading companion to a file tab\'s header menu, and sets the companion when clicked', async () => {
		const {
			app,
			readingCompanion,
			leaf
		} = await setUp();

		const items = openFileMenu(
			app,
			'tab-header',
			leaf
		);
		items[0].click();

		expect(items.map((item) => item.title)).toEqual(['Set reading companion']);
		expect(readingCompanion.isSet()).toBe(true);
	});

	it('adds nothing to a menu that is not a tab header\'s', async () => {
		const {
			app,
			leaf
		} = await setUp();

		const items = openFileMenu(
			app,
			'file-explorer-context-menu',
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds nothing for a tab with no file', async () => {
		const { app } = await setUp();
		const tab = await addNonFileTab(
			app,
			{}
		);

		const items = openFileMenu(
			app,
			'tab-header',
			tab
		);

		expect(items).toEqual([]);
	});
});