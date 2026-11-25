/** @file Tests for the tab-header context menu. */
import {
	App,
	WorkspaceLeaf
} from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { registerTabHeaderMenu } from './tabHeaderMenu';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith,
	choosing,
	selecting,
	submitting
} from '../test/clusterHelpers';
import { buildDependencies } from '../test/dependencyHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';
import { openFileMenu } from '../test/menuHelpers';
import SettingsStore from '../settings/SettingsStore';
import type { CommandDependencies } from '../types';

describe('registerTabHeaderMenu', () => {
	/**
	 * Registers the menu and opens a tab header menu.
	 *
	 * @param app - The fake app.
	 * @param store - The store.
	 * @param leaf - The `leaf` Obsidian passes.
	 * @param overrides - Dependencies to replace.
	 * @param source - The `source` Obsidian passes.
	 * @returns The items added to the menu.
	 */
	function openMenu(
		app: App,
		store: SettingsStore,
		leaf: WorkspaceLeaf | undefined,
		overrides: Partial<CommandDependencies> = {},
		source: string = 'tab-header'
	): ReturnType<typeof openFileMenu> {
		registerTabHeaderMenu(
			buildDependencies(
				app,
				store,
				overrides
			),
			() => {}
		);
		return openFileMenu(
			app,
			source,
			leaf
		);
	}

	it('registers one listener', () => {
		const app = createFakeWorkspaceApp();
		const registerEvent = vi.fn();

		registerTabHeaderMenu(
			buildDependencies(
				app,
				buildStore()
			),
			registerEvent
		);

		expect(registerEvent).toHaveBeenCalledTimes(1);
	});

	it('offers only the creation items when no Cluster exists', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);

		const items = openMenu(
			app,
			buildStore(),
			leaf
		);

		expect(items.map((item) => item.title)).toEqual([
			'Create cluster from tab',
			'Create cluster from pane'
		]);
	});

	it('offers every item in order for a file held by a Cluster', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		const store = buildStoreWith(
			buildCluster({
				id: 'old',
				lastTouchedAt: 1,
				members: ['a.md']
			}),
			buildCluster({
				id: 'new',
				name: 'Reading',
				lastTouchedAt: 9
			})
		);
		const rootLeaf = leaf;

		const items = openMenu(
			app,
			store,
			rootLeaf
		);

		expect(items.map((item) => item.title)).toEqual([
			'Create cluster from tab',
			'Create cluster from pane',
			'Add to cluster',
			'Add to Reading',
			'Remove from cluster',
			'Set reading companion'
		]);
	});

	it('reads the Clusters when the menu opens, not when it is registered', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		const store = buildStore();
		registerTabHeaderMenu(
			buildDependencies(
				app,
				store
			),
			() => {}
		);
		await store.update({ clusters: buildStoreWith(buildCluster({ name: 'Later' })).get().clusters });

		const items = openFileMenu(
			app,
			'tab-header',
			leaf
		);

		expect(items.map((item) => item.title)).toContain('Add to Later');
	});

	it('adds nothing for a tab with no file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(
			app,
			{}
		);

		const items = openMenu(
			app,
			buildStoreWith(buildCluster()),
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds nothing to a menu from another source', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);

		const items = openMenu(
			app,
			buildStoreWith(buildCluster()),
			leaf,
			{},
			'file-explorer-context-menu'
		);

		expect(items).toEqual([]);
	});

	it('adds nothing when no leaf is given', () => {
		const items = openMenu(
			createFakeWorkspaceApp(),
			buildStoreWith(buildCluster()),
			undefined
		);

		expect(items).toEqual([]);
	});

	it('runs the action of the clicked item on the menu\'s tab', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		const items = openMenu(
			app,
			store,
			leaf,
			{ promptForClusterChoice: choosing('one').prompt }
		);

		items.find((item) => item.title === 'Add to cluster')?.click();

		expect(store.get().clusters['one'].members).toEqual(['a.md']);
	});

	it('runs creation and removal prompts from their items', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		const store = buildStoreWith(
			buildCluster({
				id: 'one',
				members: ['a.md']
			}),
			buildCluster({
				id: 'two',
				members: ['a.md']
			})
		);
		const items = openMenu(
			app,
			store,
			leaf,
			{
				promptForCluster: submitting({ name: 'New' }).prompt,
				promptForClusterRemoval: selecting(['one']).prompt,
			}
		);

		items.find((item) => item.title === 'Remove from cluster')?.click();
		await Promise.resolve();

		expect(store.get().clusters['one'].members).toEqual([]);
	});
});
