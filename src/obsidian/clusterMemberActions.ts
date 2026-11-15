/** @file Builds the actions a Cluster's member list offers. */
import { App } from 'obsidian';
import { startFileDrag } from './fileDrag';
import {
	openMemberFile,
	removePathFromClusters,
	reorderClusterMember
} from '../clusters/clusterMembership';
import SettingsStore from '../settings/SettingsStore';
import ResolveMissingModal from '../ui/ResolveMissingModal';
import type { ClusterMemberActions } from '../types';

/**
 * Builds the actions for the member list of one Cluster.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param clusterId - Id of the Cluster.
 * @returns The actions.
 */
export function buildMemberActions(
	app: App,
	settingsStore: SettingsStore,
	clusterId: string
): ClusterMemberActions {
	return {
		dragMember: (path, event) => startFileDrag(
			app,
			event,
			path
		),
		moveMember: (fromIndex, toIndex) => {
			void reorderClusterMember(
				settingsStore,
				clusterId,
				fromIndex,
				toIndex
			);
		},
		openMember: (path) => {
			void openMemberFile(app, path);
		},
		removeMember: (path) => {
			void removePathFromClusters(
				settingsStore,
				[clusterId],
				path
			);
		},
		resolveMissing: (focusPath) => {
			new ResolveMissingModal(
				app,
				settingsStore,
				clusterId,
				focusPath
			).open();
		},
	};
}