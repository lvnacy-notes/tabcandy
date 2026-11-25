/** @file The command that creates a Cluster from the active pane's tabs. */
import type { Command } from 'obsidian';
import {
	buildTabActionCommand,
	CREATE_CLUSTER_FROM_ACTIVE_PANE
} from '../clusters/tabActions';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that creates a Cluster from the file-backed tabs of the most recent tab's pane.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `create-cluster-from-active-pane` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildTabActionCommand(
		dependencies,
		CREATE_CLUSTER_FROM_ACTIVE_PANE
	);
}
