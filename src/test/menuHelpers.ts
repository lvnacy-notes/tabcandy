/** @file Helpers for driving context menus in tests. */
import {
	App,
	Menu,
	WorkspaceLeaf
} from 'obsidian';
import { vi } from 'vitest';
import { Menu as MenuMock } from 'obsidian-test-mocks/obsidian';

/**
 * Records each menu a component shows, in the order shown, without displaying it.
 *
 * @returns The recorded menus, filled as menus are shown.
 */
export function captureMenus(): MenuMock[] {
	const menus: MenuMock[] = [];
	vi.spyOn(
		Menu.prototype,
		'showAtMouseEvent'
	).mockImplementation(function (this: Menu) {
		menus.push(this as unknown as MenuMock);
		return this;
	});
	return menus;
}

/**
 * Opens a context menu the way Obsidian does and reads the items that
 * registered `file-menu` listeners added to it.
 *
 * @param app - The fake app.
 * @param source - The `source` Obsidian passes.
 * @param leaf - The `leaf` Obsidian passes.
 * @returns The items in the order they were added, each with its title and a click trigger.
 */
export function openFileMenu(
	app: App,
	source: string,
	leaf: WorkspaceLeaf | undefined
): {
	title: string;
	click: () => void
}[] {
	const menu = MenuMock.create2__();
	app.workspace.trigger(
		'file-menu',
		menu.asOriginalType2__(),
		{ path: 'irrelevant.md' },
		source,
		leaf
	);
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