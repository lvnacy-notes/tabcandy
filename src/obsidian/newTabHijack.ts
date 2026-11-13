/** @file Replaces empty tabs with Tab Candy. */
import {
	App,
	EventRef,
	WorkspaceLeaf
} from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import { TAB_CANDY_VIEW_TYPE } from '../types';

/**
 * Replaces what `leaf` shows with the Tab Candy view, then reveals the leaf.
 *
 * @param app - The Obsidian app.
 * @param leaf - The leaf to convert.
 */
async function setLeafToTabCandy(app: App, leaf: WorkspaceLeaf): Promise<void> {
	await leaf.setViewState({
		type: TAB_CANDY_VIEW_TYPE,
		active: true,
	});
	await app.workspace.revealLeaf(leaf);
}

/**
 * Reveals the open Tab Candy leaf when there is one. Otherwise creates a
 * leaf and converts it to Tab Candy.
 *
 * @param app - The Obsidian app.
 */
export async function activateView(app: App): Promise<void> {
	const { workspace } = app;
	const existing = workspace.getLeavesOfType(TAB_CANDY_VIEW_TYPE)[0];
	if (existing) {
		await workspace.revealLeaf(existing);
		return;
	}

	const leaf = workspace.getLeaf(true);
	await setLeafToTabCandy(app, leaf);
}

/**
 * Converts the most recent leaf to Tab Candy on each `layout-change` when it
 * is empty and `replaceEmptyTabsWithTabCandy` is on.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 * @param registerEvent - Registers the listener with the owning component.
 */
export function registerNewTabHijack(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void
): void {
	registerEvent(
		app.workspace.on('layout-change', () => {
			if (!settingsStore.get().replaceEmptyTabsWithTabCandy) {
				return;
			}

			const leaf = app.workspace.getMostRecentLeaf();
			if (leaf?.getViewState().type === 'empty') {
				void setLeafToTabCandy(app, leaf);
			}
		})
	);
}