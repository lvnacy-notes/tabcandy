/** @file The pair-clusters command. */
import {
	Command,
	Notice
} from 'obsidian';
import { pairWithConfirmation } from '../clusters/clusterPairing';
import SettingsStore from '../settings/SettingsStore';
import type {
	PromptForClusterPair,
	PromptForConfirmation
} from '../types';

/**
 * Builds the command that pairs two Clusters picked in one modal. Always
 * available. Shows a notice when there are fewer than two Clusters.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param promptPair - Collects the two Clusters.
 * @param confirm - Collects the confirmation.
 * @returns The `pair-clusters` command.
 */
export function buildInvokeCommand(
	settingsStore: SettingsStore,
	promptPair: PromptForClusterPair,
	confirm: PromptForConfirmation
): Command {
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