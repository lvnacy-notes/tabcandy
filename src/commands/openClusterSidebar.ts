/** @file The command that opens the Cluster sidebar. */
import {
	App,
	Command
} from 'obsidian';
import { activateClusterSidebar } from '../obsidian/clusterSidebarActivation';

/**
 * Builds the command that opens the Cluster sidebar, reusing an open one.
 *
 * @param app - The Obsidian app.
 * @returns The `open-cluster-sidebar` command.
 */
export function buildInvokeCommand(app: App): Command {
	return {
		id: 'open-cluster-sidebar',
		name: 'Open cluster sidebar',
		callback: () => {
			void activateClusterSidebar(app);
		},
	};
}