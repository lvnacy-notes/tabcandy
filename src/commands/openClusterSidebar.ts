/** @file The command that opens the Cluster sidebar. */
import type { Command } from 'obsidian';
import { activateClusterSidebar } from '../obsidian/clusterSidebarActivation';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that opens the Cluster sidebar, reusing an open one.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `open-cluster-sidebar` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	const { app } = dependencies;

	return {
		id: 'open-cluster-sidebar',
		name: 'Open cluster sidebar',
		callback: () => {
			void activateClusterSidebar(app);
		},
	};
}