/** @file The command that opens a Tray for a chosen Cluster. */
import { App, Command } from 'obsidian';
import { openClusterTray } from '../obsidian/trayLeaves';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice } from '../types';

/**
 * Builds the command that asks which Cluster to open and opens its Tray.
 * Available only when a Cluster exists.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice of Cluster.
 * @returns The `open-cluster-tray` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForClusterChoice
): Command {
	return {
		id: 'open-cluster-tray',
		name: 'Open a cluster tray',
		checkCallback: (checking) => {
			const clusters = Object.values(settingsStore.get().clusters);
			if (clusters.length === 0) {
				return false;
			}
			if (!checking) {
				prompt(
					clusters,
					(id) => {
						void openClusterTray(
							app,
							settingsStore,
							id
						);
					},
					{ action: 'Open', title: 'Open a cluster tray' }
				);
			}
			return true;
		},
	};
}