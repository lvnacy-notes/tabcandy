/** @file The open-cluster command. */
import type { Command } from 'obsidian';
import { buildChooseClusterCommand } from '../clusters/chooseClusterCommand';
import { openCluster } from '../obsidian/clusterOpenClose';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that opens a Cluster's members as tabs. Available when a Cluster exists and asks which.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `open-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildChooseClusterCommand(
		dependencies,
		{
			id: 'open-cluster',
			name: 'Open cluster',
			action: 'Open',
			onChoose: (clusterId, { 
				app, 
				settingsStore 
			}) => {
				void openCluster(
					app,
					settingsStore,
					clusterId
				);
			},
		}
	);
}
