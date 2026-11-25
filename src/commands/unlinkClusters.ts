/** @file The unlink-clusters command. */
import type { Command } from 'obsidian';
import {
	getActiveClusters,
	promptAndUnlink
} from '../clusters/clusterPairing';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that unlinks the active Cluster from its partner. Available only when the active tab belongs to a paired Cluster.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `unlink-clusters` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const {
		app,
		settingsStore,
		promptForClusterChoice: promptChoice,
		promptForConfirmation: confirm
	} = dependencies;

	return {
		id: 'unlink-clusters',
		name: 'Unlink clusters',
		checkCallback: (checking) => {
			const paired = getActiveClusters(
				app,
				settingsStore
			).filter((cluster) => cluster.pairedWith !== null);
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