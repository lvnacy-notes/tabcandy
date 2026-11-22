/** @file The unlink-clusters command. */
import { App, Command } from 'obsidian';
import { getActiveClusters, promptAndUnlink } from '../clusters/clusterPairing';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice, PromptForConfirmation } from '../types';

/**
 * Builds the command that unlinks the active Cluster from its partner. Available only when the active Tray or tab belongs to a paired Cluster.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param promptChoice - Collects the choice when several paired Clusters hold the file.
 * @param confirm - Collects the confirmation.
 * @returns The `unlink-clusters` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	promptChoice: PromptForClusterChoice,
	confirm: PromptForConfirmation
): Command {
	return {
		id: 'unlink-clusters',
		name: 'Unlink clusters',
		checkCallback: (checking) => {
			const paired = getActiveClusters(app, settingsStore).filter((cluster) => cluster.pairedWith !== null);
			if (paired.length === 0) {
				return false;
			}
			if (!checking) {
				promptAndUnlink(
					settingsStore,
					promptChoice,
					confirm,
					paired
				);
			}
			return true;
		},
	};
}