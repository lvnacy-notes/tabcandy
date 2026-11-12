/** @file Tests for the tab-header context menu items that create a Cluster. */
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
import { Menu as MenuMock } from 'obsidian-test-mocks/obsidian';
import { registerClusterCreationMenu } from './clusterMenu';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStore,
	cancelling,
	submitting
} from '../test/clusterHelpers';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForCluster } from '../types';

/** A menu item as the mock `Menu` records it. */
interface RecordedItem {
	title: string;
	click: () => void;
}

/**
 * Reads the items a mock `Menu` recorded.
 *
 * @param menu - The mock menu.
 * @returns The items, in the order they were added.
 */
function recordedItems(menu: MenuMock): RecordedItem[] {
	return menu.menuItems__.map((item) => {
		const title = item.title__;
		if (typeof title !== 'string') {
			throw new TypeError('Expected the menu item title to be a string');
		}

		return {
			title,
			click: () => {
				item.onClick__?.(new MouseEvent('click'));
			},
		};
	});
}

describe('registerClusterCreationMenu', () => {
	/**
	 * Registers the menu listener and opens a menu the way Obsidian does.
	 *
	 * @param app - The fake app.
	 * @param store - The store.
	 * @param prompt - The prompt.
	 * @param source - The `source` Obsidian passes.
	 * @param leaf - The `leaf` Obsidian passes.
	 * @returns The items added to the menu.
	 */
	function openMenu(
		app: App,
		store: SettingsStore,
		prompt: PromptForCluster,
		source: string,
		leaf: WorkspaceLeaf | undefined
	): RecordedItem[] {
		registerClusterCreationMenu(
			app,
			store,
			() => {},
			prompt
		);
		const menu = MenuMock.create2__();
		app.workspace.trigger(
			'file-menu',
			menu.asOriginalType2__(),
			{ path: 'irrelevant.md' },
			source,
			leaf
		);
		return recordedItems(menu);
	}

	it('registers one listener', () => {
		const app = createFakeWorkspaceApp();
		const registerEvent = vi.fn();

		registerClusterCreationMenu(
			app,
			buildStore(),
			registerEvent,
			cancelling().prompt
		);

		expect(registerEvent).toHaveBeenCalledTimes(1);
	});

	it('adds both items to a tab header\'s menu', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			leaf
		);

		expect(items.map((item) => item.title)).toEqual([
			'Create cluster from tab',
			'Create cluster from pane',
		]);
	});

	it('adds nothing to a menu from another source', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'file-explorer-context-menu',
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds nothing when no leaf is given', () => {
		const app = createFakeWorkspaceApp();

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			undefined
		);

		expect(items).toEqual([]);
	});

	it('adds nothing for a tab with no file in a pane with none', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(app, {});

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds only the pane item for a tab with no file in a pane with files', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'a.md', pane);
		const leaf = await addNonFileTab(app, pane);

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			leaf
		);

		expect(items.map((item) => item.title)).toEqual(['Create cluster from pane']);
	});

	it('creates a Cluster of the clicked tab only from "Create cluster from tab"', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'sibling.md', pane);
		const clicked = await addFileTab(app, 'clicked.md', pane);
		const store = buildStore();
		const items = openMenu(
			app,
			store,
			submitting({ name: 'Tab' }).prompt,
			'tab-header',
			clicked
		);

		items[0].click();

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['clicked.md']);
	});

	it('creates a Cluster of the whole pane from "Create cluster from pane"', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'sibling.md', pane);
		const clicked = await addFileTab(app, 'clicked.md', pane);
		const store = buildStore();
		const items = openMenu(
			app,
			store,
			submitting({ name: 'Pane' }).prompt,
			'tab-header',
			clicked
		);

		items[1].click();

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['sibling.md', 'clicked.md']);
	});

	it('creates nothing when the prompt is cancelled', async () => {
		const app = createFakeWorkspaceApp();
		const clicked = await addFileTab(app, 'clicked.md', {});
		const store = buildStore();
		const items = openMenu(
			app,
			store,
			cancelling().prompt,
			'tab-header',
			clicked
		);

		items[0].click();

		expect(store.get().clusters).toEqual({});
	});
});