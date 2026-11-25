/** @file The add-to-cluster command. */
import type { Command } from 'obsidian';
import {
	buildTabActionCommand,
	ADD_TO_CLUSTER
} from '../clusters/tabActions';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that adds the most recent tab's file to a chosen Cluster.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `add-to-cluster` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildTabActionCommand(
		dependencies,
		ADD_TO_CLUSTER
	);
}