/** @file The Cluster Tray component. */
import { TFile } from 'obsidian';
import {
	MemberList,
	openClusterMenu
} from './components';
import {
	useSettings,
	useVaultRevision
} from './hooks';
import { buildMemberActions } from '../obsidian/clusterMemberActions';
import {
	closeCluster,
	getOpenMembers,
	openCluster
} from '../obsidian/clusterOpenClose';
import { ClusterBaseProps } from '../types';

interface ClusterTrayProps extends ClusterBaseProps {
	clusterId: string | null;
	onOpenMember?: (path: string) => void;
}

/**
 * One Cluster: its name as a title with an options button, then its members. The title's context menu and the options button open the same menu. Shows an empty state when the Cluster doesn't exist, including after it is deleted. Re-renders when Clusters change or a vault file is created, deleted or renamed.
 *
 * @param props.app - The Obsidian app.
 * @param props.settingsStore - Store holding the Clusters.
 * @param props.clusterId - Id of the Cluster to show, or null for none.
 * @param props.onConfirmUnlink - Called with the Cluster's id when Unlink is chosen from the menu.
 * @param props.onDeleteCluster - Called with the Cluster's id when Delete cluster is chosen from the menu.
 * @param props.onEditCluster - Called with the Cluster's id when Edit cluster is chosen from the menu.
 * @param props.onOpenMember - Called with a clicked member's path. Defaults to opening it in the active pane.
 * @param props.onPair - Called with the Cluster's id when Pair with… is chosen from the menu.
 */
export default function ClusterTray({
	app,
	settingsStore,
	clusterId,
	onConfirmUnlink,
	onDeleteCluster,
	onEditCluster,
	onOpenMember,
	onPair,
}: ClusterTrayProps) {
	const { clusters } = useSettings(settingsStore);
	useVaultRevision(app);

	const cluster = clusterId === null ? undefined : clusters[clusterId];

	if (cluster === undefined) {
		return (
			<div className = 'tabcandy-tray-root' >
				<div className = 'tabcandy-empty' >This cluster no longer exists.</div>
			</div>
		);
	}

	const actions = buildMemberActions(
		app,
		settingsStore,
		cluster.id
	);

	const partner = cluster.pairedWith === null ? undefined : clusters[cluster.pairedWith];

	/**
	 * Opens the Cluster's options menu.
	 *
	 * @param event - The event that opened it.
	 */
	const openMenu = (event: MouseEvent): void => {
		openClusterMenu(event, {
			hasOpenMember: () => getOpenMembers(
				app,
				cluster
			).size > 0,
			onCloseCluster: () => {
				void closeCluster(
					app,
					settingsStore,
					cluster.id
				);
			},
			onConfirmUnlink: () => onConfirmUnlink(cluster.id),
			onDeleteCluster: () => onDeleteCluster(cluster.id),
			onEditCluster: () => onEditCluster(cluster.id),
			onOpenCluster: () => {
				void openCluster(
					app,
					settingsStore,
					cluster.id
				);
			},
			onPair: () => onPair(cluster.id),
			pairedName: partner?.name ?? null,
		});
	};

	return (
		<div className = 'tabcandy-tray-root' >
			<div className = 'tabcandy-tray-header' >
				<h2
					className = 'tabcandy-tray-title'
					onContextMenu = { (event) => {
						event.preventDefault();
						openMenu(event.nativeEvent);
					} }
				>
					{ cluster.name }
				</h2>
				<button
					className = 'tabcandy-menu-button'
					aria-label = 'Cluster options'
					onClick = { (event) => openMenu(event.nativeEvent) }
				>
					⋯
				</button>
			</div>
			<MemberList
				cluster = { cluster }
				isFilePresent = { (path) => app.vault.getAbstractFileByPath(path) instanceof TFile }
				onDragMember = { actions.dragMember }
				onMoveMember = { actions.moveMember }
				onOpenMember = { onOpenMember ?? actions.openMember }
				onRemoveMember = { actions.removeMember }
				onResolveMissing = { actions.resolveMissing }
			/>
		</div>
	);
}