import {
	App,
	EventRef
} from 'obsidian';
import {
	getPanePaths,
	getTabPath,
	promptAndCreate
} from '../clusters/clusterCreation';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForCluster } from '../types';

/** `source` Obsidian passes to `file-menu` for a tab header's context menu. */
const TAB_HEADER_SOURCE = 'tab-header';

/**
 * Adds "Create cluster from tab" and "Create cluster from pane" to a tab
 * header's context menu. Each item appears only when the tab, or its pane,
 * has file-backed tabs.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param registerEvent - Registers the listener with the owning component.
 * @param prompt - Collects the Cluster details.
 */
export function registerClusterCreationMenu(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void,
	prompt: PromptForCluster
): void {
	registerEvent(
		app.workspace.on('file-menu', (menu, _file, source, leaf) => {
			if (source !== TAB_HEADER_SOURCE || leaf === undefined) {
				return;
			}

			const tabPath = getTabPath(leaf);
			if (tabPath !== null) {
				menu.addItem((item) => {
					item
						.setTitle('Create cluster from tab')
						.setIcon('layers')
						.onClick(() => {
							promptAndCreate(
								settingsStore,
								prompt,
								[tabPath]
							);
						});
				});
			}

			const panePaths = getPanePaths(app, leaf);
			if (panePaths.length > 0) {
				menu.addItem((item) => {
					item
						.setTitle('Create cluster from pane')
						.setIcon('layers')
						.onClick(() => {
							promptAndCreate(
								settingsStore,
								prompt,
								panePaths
							);
						});
				});
			}
		})
	);
}