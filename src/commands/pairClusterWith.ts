/** @file The pair-cluster-with command. */
import { App, Command } from 'obsidian';
import { getActiveClusters, promptAndPair } from '../clusters/clusterPairing';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice, PromptForConfirmation } from '../types';

/**
 * Builds the command that pairs the active Cluster with another. Available only when the active Tray or tab belongs to a Cluster. Asks which first when the active tab's file belongs to several.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param promptChoice - Collects the choice of Cluster.
 * @param confirm - Collects the confirmation.
 * @returns The `pair-cluster-with` command.
 */
export function buildInvokeCommand(
	app: App,
	settingsStore: SettingsStore,
	promptChoice: PromptForClusterChoice,
	confirm: PromptForConfirmation
): Command {
	return {
		id: 'pair-cluster-with',
		name: 'Pair cluster with…',
		checkCallback: (checking) => {
			const active = getActiveClusters(app, settingsStore);
			if (active.length === 0) {
				return false;
			}
			if (!checking) {
				if (active.length === 1) {
					promptAndPair(
						settingsStore,
						promptChoice,
						confirm,
						active[0].id
					);
				} else {
					promptChoice(
						active,
						(id) => {
							promptAndPair(
								settingsStore,
								promptChoice,
								confirm,
								id
							);
						},
						{ action: 'Choose', title: 'Pair which cluster?' }
					);
				}
			}
			return true;
		},
	};
}