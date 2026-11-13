/** @file Tests for the tab-header context menu items that add a file to Clusters and remove it from them. */
import { App, WorkspaceLeaf } from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { registerClusterMembershipMenu } from './clusterMembershipMenu';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	buildStoreWith,
	choosing,
	choosingNothing,
	selecting,
	selectingNothing
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import { openFileMenu } from '../test/menuHelpers';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice, PromptForClusterRemoval } from '../types';

describe('registerClusterMembershipMenu', () => {
	/**
	 * Registers the menu listener and opens a tab header menu.
	 *
	 * @param app - The fake app.
	 * @param store - The store.
	 * @param leaf - The `leaf` Obsidian passes.
	 * @param promptToAdd - The add prompt.
	 * @param promptToRemove - The removal prompt.
	 * @param source - The `source` Obsidian passes.
	 * @returns The items added to the menu.
	 */
	function openMenu(
		app: App,
		store: SettingsStore,
		leaf: WorkspaceLeaf | undefined,
		promptToAdd: PromptForClusterChoice = choosingNothing().prompt,
		promptToRemove: PromptForClusterRemoval = selectingNothing().prompt,
		source: string = 'tab-header'
	): ReturnType<typeof openFileMenu> {
		registerClusterMembershipMenu(
			app,
			store,
			() => {},
			promptToAdd,
			promptToRemove
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

		registerClusterMembershipMenu(
			app,
			buildStore(),
			registerEvent,
			choosingNothing().prompt,
			selectingNothing().prompt
		);

		expect(registerEvent).toHaveBeenCalledTimes(1);
	});

	it('adds nothing when there are no Clusters', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});

		const items = openMenu(
			app,
			buildStore(),
			leaf
		);

		expect(items).toEqual([]);
	});

	it('offers "Add to cluster" and the most recent Cluster by name', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStoreWith(
			buildCluster({ id: 'old', name: 'Old', lastTouchedAt: 1 }),
			buildCluster({ id: 'new', name: 'Reading', lastTouchedAt: 9 })
		);

		const items = openMenu(
			app,
			store,
			leaf
		);

		expect(items.map((item) => item.title)).toEqual(['Add to cluster', 'Add to Reading']);
	});

	it('omits the most recent Cluster item when that Cluster already holds the file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStoreWith(
			buildCluster({ id: 'old', lastTouchedAt: 1 }),
			buildCluster({ id: 'new', lastTouchedAt: 9, members: ['a.md'] })
		);

		const items = openMenu(
			app,
			store,
			leaf
		);

		expect(items.map((item) => item.title)).toEqual(['Add to cluster', 'Remove from cluster']);
	});

	it('offers "Remove from cluster" only when a Cluster holds the file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStoreWith(buildCluster({ members: ['other.md'] }));

		const items = openMenu(
			app,
			store,
			leaf
		);

		expect(items.map((item) => item.title)).not.toContain('Remove from cluster');
	});

	it('reads the Clusters when the menu opens, not when it is registered', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStore();
		registerClusterMembershipMenu(
			app,
			store,
			() => {},
			choosingNothing().prompt,
			selectingNothing().prompt
		);
		await store.update({ clusters: buildStoreWith(buildCluster({ name: 'Later' })).get().clusters });

		const items = openFileMenu(
			app,
			'tab-header',
			leaf
		);

		expect(items.map((item) => item.title)).toEqual(['Add to cluster', 'Add to Later']);
	});

	it('adds nothing for a tab with no file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(app, {});

		const items = openMenu(
			app,
			buildStoreWith(buildCluster()),
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds nothing to a menu from another source', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});

		const items = openMenu(
			app,
			buildStoreWith(buildCluster()),
			leaf,
			choosingNothing().prompt,
			selectingNothing().prompt,
			'file-explorer-context-menu'
		);

		expect(items).toEqual([]);
	});

	it('adds nothing when no leaf is given', () => {
		const app = createFakeWorkspaceApp();

		const items = openMenu(
			app,
			buildStoreWith(buildCluster()),
			undefined
		);

		expect(items).toEqual([]);
	});

	it('adds the file to the chosen Cluster from "Add to cluster"', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStoreWith(
			buildCluster({ id: 'one', lastTouchedAt: 1 }),
			buildCluster({ id: 'two', lastTouchedAt: 9 })
		);
		const items = openMenu(
			app,
			store,
			leaf,
			choosing('one').prompt
		);

		items[0].click();

		expect(store.get().clusters['one'].members).toEqual(['a.md']);
	});

	it('adds the file to the most recent Cluster from "Add to [name]"', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStoreWith(
			buildCluster({ id: 'one', lastTouchedAt: 1 }),
			buildCluster({ id: 'two', lastTouchedAt: 9 })
		);
		const items = openMenu(
			app,
			store,
			leaf
		);

		items[1].click();

		expect(store.get().clusters['two'].members).toEqual(['a.md']);
	});

	it('removes the file from the selected Clusters from "Remove from cluster"', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);
		const items = openMenu(
			app,
			store,
			leaf,
			choosingNothing().prompt,
			selecting(['one']).prompt
		);

		items[items.length - 1].click();

		expect([store.get().clusters['one'].members, store.get().clusters['two'].members]).toEqual([[], ['a.md']]);
	});
});