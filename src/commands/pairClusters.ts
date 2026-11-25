/** @file The pair-clusters command. */
import {
	Command,
	Notice
} from 'obsidian';
import { pairWithConfirmation } from '../clusters/clusterPairing';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that pairs two Clusters picked in one modal. Always
 * available. Shows a notice when there are fewer than two Clusters.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `pair-clusters` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const {
		settingsStore,
		promptForClusterPair: promptPair,
		promptForConfirmation: confirm
	} = dependencies;

	return {
		id: 'pair-clusters',
		name: 'Pair clusters…',
		callback: () => {
			const clusters = Object.values(settingsStore.get().clusters);
			if (clusters.length < 2) {
				new Notice('Pairing needs at least two clusters.');
				return;
			}
			promptPair(clusters, (sourceId, targetId) => {
				pairWithConfirmation(
					settingsStore,
					confirm,
					sourceId,
					targetId
				);
			});
		},
	};
}