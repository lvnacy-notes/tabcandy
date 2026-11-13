/** @file Builds every command the plugin registers. */
import { Command } from 'obsidian';
import { buildInvokeCommand as buildAddToClusterCommand } from './addToCluster';
import { buildInvokeCommand as buildAddToMostRecentClusterCommand } from './addToMostRecentCluster';
import { buildInvokeCommand as buildCloseDuplicateTabsCommand } from './closeDuplicateTabs';
import { buildInvokeCommand as buildCloseOtherTabsCommand } from './closeOtherTabs';
import { buildInvokeCommand as buildCloseTabsInFolderCommand } from './closeTabsInFolder';
import { buildInvokeCommand as buildCreateClusterCommand } from './createCluster';
import { buildInvokeCommand as buildCreateClusterFromActivePaneCommand } from './createClusterFromActivePane';
import { buildInvokeCommand as buildCreateClusterFromActiveTabCommand } from './createClusterFromActiveTab';
import { buildInvokeCommand as buildNextTabAcrossGroupsCommand } from './nextTabAcrossGroups';
import { buildInvokeCommand as buildOpenTabCandyCommand } from './openTabCandy';
import { buildInvokeCommand as buildPreviousTabAcrossGroupsCommand } from './previousTabAcrossGroups';
import { buildInvokeCommand as buildRemoveFromClusterCommand } from './removeFromCluster';
import { buildInvokeCommand as buildReopenClosedTabCommand } from './reopenClosedTab';
import { buildInvokeCommand as buildSearchOpenTabsCommand } from './searchOpenTabs';
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
		promptForClusterRemoval
	} = dependencies;

	return [
		buildAddToClusterCommand(
			app,
			settingsStore,
			promptForClusterChoice
		),
		buildAddToMostRecentClusterCommand(app, settingsStore),
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
		buildOpenTabCandyCommand(app),
		buildPreviousTabAcrossGroupsCommand(app),
		buildRemoveFromClusterCommand(
			app,
			settingsStore,
			promptForClusterRemoval
		),
		buildReopenClosedTabCommand(app),
		buildSearchOpenTabsCommand(app),
	];
}