/** @file The command that creates a Cluster from the active tab. */
import type { Command } from 'obsidian';
import {
	buildTabActionCommand,
	CREATE_CLUSTER_FROM_ACTIVE_TAB
} from '../clusters/tabActions';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that creates a Cluster from the most recent tab's file.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `create-cluster-from-active-tab` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildTabActionCommand(
		dependencies,
		CREATE_CLUSTER_FROM_ACTIVE_TAB
	);
}
