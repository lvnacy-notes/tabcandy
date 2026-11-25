/** @file The edit-cluster command. */
import type { Command } from 'obsidian';
import { buildChooseClusterCommand } from '../clusters/chooseClusterCommand';
import { promptAndEdit } from '../clusters/clusterManagement';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that edits a Cluster's name and Flavor. Available when a Cluster exists and asks which.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `edit-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildChooseClusterCommand(
		dependencies,
		{
			id: 'edit-cluster',
			name: 'Edit cluster',
			action: 'Edit',
			onChoose: (clusterId, { 
				settingsStore, 
				promptForCluster 
			}) => {
				promptAndEdit(
					settingsStore,
					promptForCluster,
					clusterId
				);
			},
		}
	);
}
