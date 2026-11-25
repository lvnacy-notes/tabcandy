/** @file The pair-cluster-with command. */
import type { Command } from 'obsidian';
import {
	getActiveClusters,
	promptAndPair
} from '../clusters/clusterPairing';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that pairs the active Cluster with another. Available only when the active tab belongs to a Cluster. Asks which first when the active tab's file belongs to several.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `pair-cluster-with` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const {
		app,
		settingsStore,
		promptForClusterChoice: promptChoice,
		promptForConfirmation: confirm
	} = dependencies;

	return {
		id: 'pair-cluster-with',
		name: 'Pair cluster with…',
		checkCallback: (checking) => {
			const active = getActiveClusters(
				app,
				settingsStore
			);
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
						{
							action: 'Choose',
							title: 'Pair which cluster?'
						}
					);
				}
			}
			return true;
		},
	};
}