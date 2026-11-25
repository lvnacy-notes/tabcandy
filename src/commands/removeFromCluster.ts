/** @file The remove-from-cluster command. */
import type { Command } from 'obsidian';
import {
	buildTabActionCommand,
	REMOVE_FROM_CLUSTER
} from '../clusters/tabActions';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that removes the most recent tab's file from the Clusters holding it.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `remove-from-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildTabActionCommand(
		dependencies,
		REMOVE_FROM_CLUSTER
	);
}
