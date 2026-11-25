/** @file The set-reading-companion command. */
import type { Command } from 'obsidian';
import {
	buildTabActionCommand,
	SET_READING_COMPANION
} from '../clusters/tabActions';
import type { CommandDependencies } from '../types';

/**
 * Builds the command that makes the active tab the reading companion of a Cluster.
 *
 * @param dependencies - What the command needs from the plugin.
 * @returns The `set-reading-companion` command.
 */
export function buildInvokeCommand(dependencies: CommandDependencies): Command {
	return buildTabActionCommand(
		dependencies,
		SET_READING_COMPANION
	);
}
