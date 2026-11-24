/** @file The Cluster sidebar component. */
import { TFile } from 'obsidian';
import { useState } from 'react';
import { ClusterRow } from './components';
import {
	useSettings,
	useVaultRevision
} from './hooks';
import { addPathToCluster } from '../clusters/clusterMembership';
import { unlinkCluster } from '../clusters/clusterPairing';
import { buildMemberActions } from '../obsidian/clusterMemberActions';
import {
	closeCluster,
	getOpenMembers,
	openCluster
} from '../obsidian/clusterOpenClose';
import {
	openClusterTray,
	openClusterTrayAt
} from '../obsidian/trayLeaves';
import { getDraggedFilePath } from '../obsidian/fileDrag';
import { ClusterBaseProps } from '../types';

interface ClusterSidebarProps extends ClusterBaseProps {
	onCreateCluster: () => void;
}

/**
 * The Cluster sidebar: a header with a create button, then every Cluster as
 * an expandable row. Re-renders when Clusters change or a vault file is
 * created, deleted or renamed.
 *
 * @param props.app - The Obsidian app.
 * @param props.settingsStore - Store holding the Clusters.
 * @param props.onConfirmUnlink - Called with a Cluster's id when Unlink is chosen from its menu.
 * @param props.onCreateCluster - Called when the create button is clicked.
 * @param props.onDeleteCluster - Called with a Cluster's id when Delete cluster is chosen from its menu.
 * @param props.onEditCluster - Called with a Cluster's id when Edit cluster is chosen from its menu.
 * @param props.onPair - Called with a Cluster's id when it is to be paired with another.
 */
export default function ClusterSidebar({
	app,
	settingsStore,
	onConfirmUnlink,
	onCreateCluster,
	onDeleteCluster,
	onEditCluster,
	onPair,
}: ClusterSidebarProps) {
	const { clusters } = useSettings(settingsStore);
	useVaultRevision(app);
	const [
		expandedIds,
		setExpandedIds
	] = useState<ReadonlySet<string>>(new Set());

	/**
	 * Expands the Cluster `id` when collapsed and collapses it when expanded.
	 *
	 * @param id - Id of the Cluster.
	 */
	const toggle = (id: string): void => {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const list = Object.values(clusters);

	return (
		<div className = 'tabcandy-sidebar-root' >
			<div className = 'tabcandy-sidebar-header' >
				<span>Clusters</span>
				<button
					className = 'tabcandy-sidebar-create'
					aria-label = 'Create cluster'
					onClick = { onCreateCluster }
				>
					+
				</button>
			</div>
			{ list.length === 0 && (
				<div className = 'tabcandy-empty' >No clusters yet.</div>
			) }
			{ list.map((cluster) => {
				const actions = buildMemberActions(
					app,
					settingsStore,
					cluster.id
				);

				return (
					<ClusterRow
						key = { cluster.id }
						cluster = { cluster }
						expanded = { expandedIds.has(cluster.id) }
						getDraggedPath = { () => getDraggedFilePath(app) }
						hasOpenMember = { () => getOpenMembers(
							app,
							cluster
						).size > 0 }
						isFilePresent = { (path) => app.vault.getAbstractFileByPath(path) instanceof TFile }
						onCloseCluster = { () => {
							void closeCluster(
								app,
								settingsStore,
								cluster.id
							);
						} }
						onConfirmUnlink = { () => onConfirmUnlink(cluster.id) }
						onDeleteCluster = { () => onDeleteCluster(cluster.id) }
						onDragCluster = { (target) => {
							void openClusterTrayAt(
								app,
								settingsStore,
								cluster.id,
								target
							);
						} }
						onDragMember = { actions.dragMember }
						onDropPath = { (path) => {
							void addPathToCluster(
								settingsStore,
								cluster.id,
								path
							);
						} }
						onEditCluster = { () => onEditCluster(cluster.id) }
						onMoveMember = { actions.moveMember }
						onOpenCluster = { () => {
							void openCluster(
								app,
								settingsStore,
								cluster.id
							);
						} }
						onOpenMember = { actions.openMember }
						onOpenTray = { () => {
							void openClusterTray(
								app,
								settingsStore,
								cluster.id
							);
						} }
						onPair = { () => onPair(cluster.id) }
						onRemoveMember = { actions.removeMember }
						onResolveMissing = { actions.resolveMissing }
						onToggle = { () => toggle(cluster.id) }
						onUnlink = { () => {
							void unlinkCluster(
								settingsStore,
								cluster.id
							);
						} }
						pairedName = { cluster.pairedWith === null ? null : clusters[cluster.pairedWith]?.name ?? null }
					/>
				);
			}) }
		</div>
	);
}