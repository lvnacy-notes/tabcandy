/** @file The Cluster Tray component. */
import { App, TFile } from 'obsidian';
import { MemberList } from './components';
import { useSettings, useVaultRevision } from './hooks';
import { buildMemberActions } from '../obsidian/clusterMemberActions';
import SettingsStore from '../settings/SettingsStore';

interface ClusterTrayProps {
	app: App;
	settingsStore: SettingsStore;
	clusterId: string | null;
	onOpenMember?: (path: string) => void;
}

/**
 * One Cluster: its name as a title, then its members. Shows an empty state when the Cluster doesn't exist, including after it is deleted. Re-renders when Clusters change or a vault file is created, deleted or renamed.
 *
 * @param props.app - The Obsidian app.
 * @param props.settingsStore - Store holding the Clusters.
 * @param props.clusterId - Id of the Cluster to show, or null for none.
 * @param props.onOpenMember - Called with a clicked member's path. Defaults to opening it in the active pane.
 */
export default function ClusterTray({
	app,
	settingsStore,
	clusterId,
	onOpenMember,
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

	return (
		<div className = 'tabcandy-tray-root' >
			<h2 className = 'tabcandy-tray-title' >{ cluster.name }</h2>
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