/** @file The actions the Cluster sidebar starts, built from the command dependencies. */
import {
	promptAndCreate,
	promptAndDelete,
	promptAndEdit
} from './clusterManagement';
import {
	promptAndPair,
	promptAndUnlink
} from './clusterPairing';
import type {
	CommandDependencies,
	SidebarHandlers
} from '../types';

/**
 * Builds the sidebar's actions over the plugin's prompts.
 *
 * @param dependencies - What the actions need from the plugin.
 * @returns The actions.
 */
export function buildSidebarHandlers(dependencies: CommandDependencies): SidebarHandlers {
	const {
		settingsStore,
		promptForCluster,
		promptForClusterChoice,
		promptForConfirmation
	} = dependencies;

	return {
		onConfirmUnlink: (id) => {
			const cluster = settingsStore.get().clusters[id];
			if (cluster !== undefined) {
				promptAndUnlink(
					settingsStore,
					promptForClusterChoice,
					promptForConfirmation,
					[cluster]
				);
			}
		},
		onCreateCluster: () => {
			promptAndCreate(
				settingsStore,
				promptForCluster,
				[]
			);
		},
		onDeleteCluster: (id) => {
			promptAndDelete(
				settingsStore,
				promptForConfirmation,
				id
			);
		},
		onEditCluster: (id) => {
			promptAndEdit(
				settingsStore,
				promptForCluster,
				id
			);
		},
		onPair: (id) => {
			promptAndPair(
				settingsStore,
				promptForClusterChoice,
				promptForConfirmation,
				id
			);
		},
	};
}
