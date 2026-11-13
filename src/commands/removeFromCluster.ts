/** @file The remove-from-cluster command. */
import { App, Command } from 'obsidian';
import { getClustersContainingPath } from '../clusters/clusters';
import { getActiveTabPath, promptAndRemove } from '../clusters/clusterMembership';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterRemoval } from '../types';

/**
 * Builds the command that removes the most recent tab's file from the
 * Clusters holding it. Available only when at least one Cluster holds it.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param prompt - Collects the choice when several Clusters hold the file.
 * @returns The `remove-from-cluster` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	prompt: PromptForClusterRemoval
): Command {
	return {
		id: 'remove-from-cluster',
		name: 'Remove from cluster',
		checkCallback: (checking) => {
			const path = getActiveTabPath(app);
			if (
				path === null ||
				getClustersContainingPath(settingsStore.get().clusters, path).length === 0
			) {
				return false;
			}
			if (!checking) {
				promptAndRemove(
					settingsStore,
					prompt,
					path
				);
			}
			return true;
		},
	};
}