/** @file Builds every command the plugin registers. */
import type { Command } from 'obsidian';
import { buildInvokeCommand as buildAddToClusterCommand } from './addToCluster';
import { buildInvokeCommand as buildAddToMostRecentClusterCommand } from './addToMostRecentCluster';
import { buildInvokeCommand as buildClearReadingCompanionCommand } from './clearReadingCompanion';
import { buildInvokeCommand as buildCloseClusterCommand } from './closeCluster';
import { buildInvokeCommand as buildCloseDuplicateTabsCommand } from './closeDuplicateTabs';
import { buildInvokeCommand as buildCloseOtherTabsCommand } from './closeOtherTabs';
import { buildInvokeCommand as buildCloseTabsInFolderCommand } from './closeTabsInFolder';
import { buildInvokeCommand as buildCreateClusterCommand } from './createCluster';
import { buildInvokeCommand as buildCreateClusterFromActivePaneCommand } from './createClusterFromActivePane';
import { buildInvokeCommand as buildCreateClusterFromActiveTabCommand } from './createClusterFromActiveTab';
import { buildInvokeCommand as buildDeleteClusterCommand } from './deleteCluster';
import { buildInvokeCommand as buildEditClusterCommand } from './editCluster';
import { buildInvokeCommand as buildNextTabAcrossGroupsCommand } from './nextTabAcrossGroups';
import { buildInvokeCommand as buildOpenClusterCommand } from './openCluster';
import { buildInvokeCommand as buildOpenClusterSidebarCommand } from './openClusterSidebar';
import { buildInvokeCommand as buildOpenTabCandyCommand } from './openTabCandy';
import { buildInvokeCommand as buildPairClusterWithCommand } from './pairClusterWith';
import { buildInvokeCommand as buildPairClustersCommand } from './pairClusters';
import { buildInvokeCommand as buildPreviousTabAcrossGroupsCommand } from './previousTabAcrossGroups';
import { buildInvokeCommand as buildRemoveFromClusterCommand } from './removeFromCluster';
import { buildInvokeCommand as buildReopenClosedTabCommand } from './reopenClosedTab';
import { buildInvokeCommand as buildSearchOpenTabsCommand } from './searchOpenTabs';
import { buildInvokeCommand as buildSetReadingCompanionCommand } from './setReadingCompanion';
import { buildInvokeCommand as buildUnlinkClustersCommand } from './unlinkClusters';
import type { CommandDependencies } from '../types';

/** Every command's builder, ordered by module name. A new command module is added here and nowhere else. */
const COMMAND_BUILDERS: Array<(dependencies: CommandDependencies) => Command> = [
	buildAddToClusterCommand,
	buildAddToMostRecentClusterCommand,
	buildClearReadingCompanionCommand,
	buildCloseClusterCommand,
	buildCloseDuplicateTabsCommand,
	buildCloseOtherTabsCommand,
	buildCloseTabsInFolderCommand,
	buildCreateClusterCommand,
	buildCreateClusterFromActivePaneCommand,
	buildCreateClusterFromActiveTabCommand,
	buildDeleteClusterCommand,
	buildEditClusterCommand,
	buildNextTabAcrossGroupsCommand,
	buildOpenClusterCommand,
	buildOpenClusterSidebarCommand,
	buildOpenTabCandyCommand,
	buildPairClusterWithCommand,
	buildPairClustersCommand,
	buildPreviousTabAcrossGroupsCommand,
	buildRemoveFromClusterCommand,
	buildReopenClosedTabCommand,
	buildSearchOpenTabsCommand,
	buildSetReadingCompanionCommand,
	buildUnlinkClustersCommand,
];

/**
 * Builds every command the plugin registers.
 *
 * @param dependencies - What the commands need from the plugin.
 * @returns The commands.
 */
export function buildCommands(dependencies: CommandDependencies): Command[] {
	return COMMAND_BUILDERS.map((build) => build(dependencies));
}