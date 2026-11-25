/** @file Builds the commands that ask which Cluster to act on. */
import type { Command } from 'obsidian';
import type {
	CommandDependencies,
	TabCandyCluster
} from '../types';

/** What distinguishes one choose-a-Cluster command from another. */
export interface ChooseClusterOptions {
	/** Command id. */
	id: string;
	/** Command name. Also the title of the prompt. */
	name: string;
	/** Label of the prompt's confirm button. */
	action: string;
	/** Narrows the Clusters the command offers. Offers all of them when omitted. */
	candidates?: (
		clusters: TabCandyCluster[], 
		dependencies: CommandDependencies
	) => TabCandyCluster[];
	/** Acts on the chosen Cluster. */
	onChoose: (
		clusterId: string, 
		dependencies: CommandDependencies
	) => void;
}

/**
 * Builds a command that asks which Cluster to act on, then acts on it. Unavailable when it has no Cluster to offer.
 *
 * @param dependencies - What the command needs from the plugin.
 * @param options - What distinguishes the command.
 * @returns The command.
 */
export function buildChooseClusterCommand(
	dependencies: CommandDependencies,
	options: ChooseClusterOptions
): Command {
	return {
		id: options.id,
		name: options.name,
		checkCallback: (checking) => {
			const all = Object.values(dependencies.settingsStore.get().clusters);
			const candidates = options.candidates === undefined ? all : options.candidates(
				all,
				dependencies
			);
			if (candidates.length === 0) {
				return false;
			}
			if (!checking) {
				dependencies.promptForClusterChoice(
					candidates,
					(clusterId) => {
						options.onChoose(
							clusterId,
							dependencies
						);
					},
					{
						action: options.action,
						title: options.name
					}
				);
			}
			return true;
		},
	};
}
