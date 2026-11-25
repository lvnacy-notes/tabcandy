/** @file The close-cluster command. */
import type { Command } from 'obsidian';
import { buildChooseClusterCommand } from '../clusters/chooseClusterCommand';
import {
	closeCluster,
	getOpenMembers
} from '../obsidian/clusterOpenClose';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that closes a Cluster's open members. Available when a Cluster has an open member and asks which.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `close-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildChooseClusterCommand(
		dependencies,
		{
			id: 'close-cluster',
			name: 'Close cluster',
			action: 'Close',
			candidates: (clusters, { app }) => clusters.filter((cluster) => getOpenMembers(
				app,
				cluster
			).size > 0),
			onChoose: (clusterId, { 
				app, 
				settingsStore 
			}) => {
				void closeCluster(
					app,
					settingsStore,
					clusterId
				);
			},
		}
	);
}
