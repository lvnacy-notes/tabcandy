/** @file Builds every command the plugin registers. */
import { Command } from 'obsidian';
import { buildInvokeCommand as buildAddToClusterCommand } from './addToCluster';
import { buildInvokeCommand as buildAddToMostRecentClusterCommand } from './addToMostRecentCluster';
import { buildInvokeCommand as buildCloseClusterCommand } from './closeCluster';
import { buildInvokeCommand as buildCloseDuplicateTabsCommand } from './closeDuplicateTabs';
import { buildInvokeCommand as buildCloseOtherTabsCommand } from './closeOtherTabs';
import { buildInvokeCommand as buildCloseTabsInFolderCommand } from './closeTabsInFolder';
import { buildInvokeCommand as buildCreateClusterCommand } from './createCluster';
import { buildInvokeCommand as buildCreateClusterFromActivePaneCommand } from './createClusterFromActivePane';
import { buildInvokeCommand as buildCreateClusterFromActiveTabCommand } from './createClusterFromActiveTab';
import { buildInvokeCommand as buildNextTabAcrossGroupsCommand } from './nextTabAcrossGroups';
import { buildInvokeCommand as buildOpenClusterCommand } from './openCluster';
import { buildInvokeCommand as buildOpenClusterSidebarCommand } from './openClusterSidebar';
import { buildInvokeCommand as buildOpenClusterTrayCommand } from './openClusterTray';
import { buildInvokeCommand as buildOpenRecentClusterTrayCommand } from './openRecentClusterTray';
import { buildInvokeCommand as buildOpenTabCandyCommand } from './openTabCandy';
import { buildInvokeCommand as buildPairClusterWithCommand } from './pairClusterWith';
import { buildInvokeCommand as buildPairClustersCommand } from './pairClusters';
import { buildInvokeCommand as buildPreviousTabAcrossGroupsCommand } from './previousTabAcrossGroups';
import { buildInvokeCommand as buildRemoveFromClusterCommand } from './removeFromCluster';
import { buildInvokeCommand as buildReopenClosedTabCommand } from './reopenClosedTab';
import { buildInvokeCommand as buildSearchOpenTabsCommand } from './searchOpenTabs';
import { buildInvokeCommand as buildUnlinkClustersCommand } from './unlinkClusters';
import type { CommandDependencies } from '../types';

/**
 * Builds every command the plugin registers, ordered by module name.
 *
 * @param dependencies - What the commands need from the plugin.
 * @returns The commands.
 */
export function buildCommands(dependencies: CommandDependencies): Command[] {
	const {
		app,
		settingsStore,
		promptForCluster,
		promptForClusterChoice,
		promptForClusterPair,
		promptForClusterRemoval,
		promptForConfirmation
	} = dependencies;

	return [
		buildAddToClusterCommand(
			app,
			settingsStore,
			promptForClusterChoice
		),
		buildAddToMostRecentClusterCommand(app, settingsStore),
		buildCloseClusterCommand(
			app,
			settingsStore,
			promptForClusterChoice
		),
		buildCloseDuplicateTabsCommand(app),
		buildCloseOtherTabsCommand(app),
		buildCloseTabsInFolderCommand(app, settingsStore),
		buildCreateClusterCommand(settingsStore, promptForCluster),
		buildCreateClusterFromActivePaneCommand(
			app,
			settingsStore,
			promptForCluster
		),
		buildCreateClusterFromActiveTabCommand(
			app,
			settingsStore,
			promptForCluster
		),
		buildNextTabAcrossGroupsCommand(app),
		buildOpenClusterCommand(
			app,
			settingsStore,
			promptForClusterChoice
		),
		buildOpenClusterSidebarCommand(app),
		buildOpenClusterTrayCommand(
			app,
			settingsStore,
			promptForClusterChoice
		),
		buildOpenRecentClusterTrayCommand(app, settingsStore),
		buildOpenTabCandyCommand(app),
		buildPairClusterWithCommand(
			app,
			settingsStore,
			promptForClusterChoice,
			promptForConfirmation
		),
		buildPairClustersCommand(
			settingsStore,
			promptForClusterPair,
			promptForConfirmation
		),
		buildPreviousTabAcrossGroupsCommand(app),
		buildRemoveFromClusterCommand(
			app,
			settingsStore,
			promptForClusterRemoval
		),
		buildReopenClosedTabCommand(app),
		buildSearchOpenTabsCommand(app),
		buildUnlinkClustersCommand(
			app,
			settingsStore,
			promptForClusterChoice,
			promptForConfirmation
		),
	];
}