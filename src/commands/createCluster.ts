/** @file The command that creates an empty Cluster. */
import type { Command } from 'obsidian';
import { promptAndCreate } from '../clusters/clusterManagement';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that creates an empty Cluster.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `create-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const {
		settingsStore,
		promptForCluster: prompt
	} = dependencies;

	return {
		id: 'create-cluster',
		name: 'Create cluster',
		callback: () => {
			promptAndCreate(
				settingsStore,
				prompt,
				[]
			);
		},
	};
}