/** @file The tab-header context menu: one registration for every tab action. */
import type { EventRef } from 'obsidian';
import {
	getMenuTitle,
	TAB_ACTIONS
} from '../clusters/tabActions';
import {
	TAB_HEADER_SOURCE,
	type CommandDependencies
} from '../types';

/**
 * Adds each applicable tab action to a tab header's context menu. Reads the Clusters when the menu opens.
 *
 * @param dependencies - What the actions need from the plugin.
 * @param registerEvent - Registers the listener with the owning component.
 */
export function registerTabHeaderMenu(
	dependencies: CommandDependencies,
	registerEvent: (eventRef: EventRef) => void
): void {
	registerEvent(dependencies.app.workspace.on(
		'file-menu',
		(
			menu,
			_file,
			source,
			leaf
		) => {
			if (source !== TAB_HEADER_SOURCE || leaf === undefined) {
				return;
			}

			for (const action of TAB_ACTIONS) {
				const title = getMenuTitle(
					action,
					leaf,
					dependencies
				);
				if (title !== null) {
					menu.addItem((item) => {
						item
							.setTitle(title)
							.setIcon(action.icon)
							.onClick(() => {
								action.run(
									leaf,
									dependencies
								);
							});
					});
				}
			}
		}
	));
}
