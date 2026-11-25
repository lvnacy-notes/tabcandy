/** @file The add-to-most-recent-cluster command. */
import type { Command } from 'obsidian';
import {
	buildTabActionCommand,
	ADD_TO_MOST_RECENT_CLUSTER
} from '../clusters/tabActions';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that adds the most recent tab's file to the Cluster with the highest `lastTouchedAt`.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `add-to-most-recent-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildTabActionCommand(
		dependencies,
		ADD_TO_MOST_RECENT_CLUSTER
	);
}
