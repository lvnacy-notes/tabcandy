/** @file The delete-cluster command. */
import type { Command } from 'obsidian';
import { buildChooseClusterCommand } from '../clusters/chooseClusterCommand';
import { promptAndDelete } from '../clusters/clusterManagement';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that deletes a Cluster after a confirmation. Available when a Cluster exists and asks which.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `delete-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildChooseClusterCommand(
		dependencies,
		{
			id: 'delete-cluster',
			name: 'Delete cluster',
			action: 'Delete',
			onChoose: (clusterId, { 
				settingsStore, 
				promptForConfirmation 
			}) => {
				promptAndDelete(
					settingsStore,
					promptForConfirmation,
					clusterId
				);
			},
		}
	);
}
