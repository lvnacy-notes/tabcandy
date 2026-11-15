/** @file The Cluster sidebar component. */
import { App, TFile } from 'obsidian';
import { useState } from 'react';
import { ClusterRow } from './components';
import { useSettings, useVaultRevision } from './hooks';
import { addPathToCluster } from '../clusters/clusterMembership';
import { buildMemberActions } from '../obsidian/clusterMemberActions';
import { openClusterTray, openClusterTrayAt } from '../obsidian/trayLeaves';
import { getDraggedFilePath } from '../obsidian/fileDrag';
import SettingsStore from '../settings/SettingsStore';

interface ClusterSidebarProps {
	app: App;
	settingsStore: SettingsStore;
	onCreateCluster: () => void;
}

/**
 * The Cluster sidebar: a header with a create button, then every Cluster as
 * an expandable row. Re-renders when Clusters change or a vault file is
 * created, deleted or renamed.
 *
 * @param props.app - The Obsidian app.
 * @param props.settingsStore - Store holding the Clusters.
 * @param props.onCreateCluster - Called when the create button is clicked.
 */
export default function ClusterSidebar({
	app,
	settingsStore,
	onCreateCluster,
}: ClusterSidebarProps) {
	const { clusters } = useSettings(settingsStore);
	useVaultRevision(app);
	const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

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
						isFilePresent = { (path) => app.vault.getAbstractFileByPath(path) instanceof TFile }
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
						onMoveMember = { actions.moveMember }
						onOpenMember = { actions.openMember }
						onOpenTray = { () => {
							void openClusterTray(
								app,
								settingsStore,
								cluster.id
							);
						} }
						onRemoveMember = { actions.removeMember }
						onResolveMissing = { actions.resolveMissing }
						onToggle = { () => toggle(cluster.id) }
					/>
				);
			}) }
		</div>
	);
}