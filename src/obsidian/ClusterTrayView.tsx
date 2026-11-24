/** @file The Obsidian view that hosts a Cluster Tray. */
import {
	ItemView,
	ViewStateResult,
	WorkspaceLeaf
} from 'obsidian';
import {
	Root,
	createRoot
} from 'react-dom/client';
import TrayReturnTracker from './TrayReturnTracker';
import ClusterTray from '../app/ClusterTray';
import SettingsStore from '../settings/SettingsStore';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

/** A tab showing one Cluster. Renders the React Tray into its content element once its saved state has been applied. */
export class ClusterTrayView extends ItemView {
	clusterId: string | null = null;
	hasState: boolean = false;
	onConfirmUnlink: (id: string) => void;
	onDeleteCluster: (id: string) => void;
	onEditCluster: (id: string) => void;
	onPair: (id: string) => void;
	root: Root | null = null;
	settingsStore: SettingsStore;
	shownTitle: string | null = null;
	trayReturn: TrayReturnTracker;
	unsubscribe: (() => void) | null = null;

	/**
	 * @param settingsStore - Store holding the Clusters.
	 * @param trayReturn - Puts the Tray back when a member opened from it is closed.
	 * @param onPair - Starts pairing a Cluster, by id.
	 * @param onConfirmUnlink - Starts unlinking a Cluster after a confirmation, by id.
	 * @param onEditCluster - Starts editing a Cluster, by id.
	 * @param onDeleteCluster - Starts deleting a Cluster after a confirmation, by id.
	 * @param leaf - The leaf hosting the view.
	 */
	constructor(
		settingsStore: SettingsStore,
		trayReturn: TrayReturnTracker,
		onPair: (id: string) => void,
		onConfirmUnlink: (id: string) => void,
		onEditCluster: (id: string) => void,
		onDeleteCluster: (id: string) => void,
		leaf: WorkspaceLeaf
	) {
		super(leaf);
		this.onConfirmUnlink = onConfirmUnlink;
		this.onDeleteCluster = onDeleteCluster;
		this.onEditCluster = onEditCluster;
		this.onPair = onPair;
		this.settingsStore = settingsStore;
		this.trayReturn = trayReturn;
	}

	/** @returns The Cluster's name, or a generic title when the Cluster is unknown. */
	getDisplayText() {
		const cluster = this.clusterId === null ? undefined : this.settingsStore.get().clusters[this.clusterId];
		return cluster?.name ?? 'Cluster tray';
	}

	/** @returns The view's icon id. */
	getIcon() {
		return 'layers';
	}

	/** @returns The state saved with the layout: the Cluster the Tray shows. */
	getState(): Record<string, unknown> {
		return { clusterId: this.clusterId };
	}

	/** @returns The view type id. */
	getViewType() {
		return CLUSTER_TRAY_VIEW_TYPE;
	}

	/** Unsubscribes from the settings and unmounts the React root. */
	onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.root?.unmount();
		this.root = null;

		return Promise.resolve();
	}

	/** Replaces any existing content with a fresh React root and starts watching the Cluster's name. */
	onOpen(): Promise<void> {
		this.contentEl.empty();

		this.root = createRoot(this.contentEl);
		this.render();
		this.containerEl.addClass('tabcandy-tray');
		this.unsubscribe?.();
		this.unsubscribe = this.settingsStore.subscribe(() => {
			this.refreshTitle();
		});

		return Promise.resolve();
	}

	/** Re-applies the leaf's view state when the title has changed since it was last shown, so the tab header picks up the new title. */
	refreshTitle(): void {
		if (!this.hasState || this.getDisplayText() === this.shownTitle) {
			return;
		}

		void this.leaf.setViewState(this.leaf.getViewState());
	}

	/** Renders the Tray for the current Cluster id. Renders nothing until the saved state has been applied. */
	render(): void {
		if (!this.hasState) {
			return;
		}

		this.root?.render(<ClusterTray
			app = { this.app }
			settingsStore = { this.settingsStore }
			clusterId = { this.clusterId }
			onConfirmUnlink = { this.onConfirmUnlink }
			onDeleteCluster = { this.onDeleteCluster }
			onEditCluster = { this.onEditCluster }
			onOpenMember = { (path) => {
				if (this.clusterId !== null) {
					void this.trayReturn.openMember(
						this.leaf,
						this.clusterId,
						path
					);
				}
			} }
			onPair = { this.onPair }
		/>);
	}

	/**
	 * Restores the Cluster the Tray shows and renders it. A state without a Cluster id leaves the Tray showing none.
	 *
	 * @param state - The saved state.
	 * @param result - Obsidian's view state result.
	 */
	async setState(state: unknown, result: ViewStateResult): Promise<void> {
		if (typeof state === 'object' && state !== null && 'clusterId' in state) {
			this.clusterId = typeof state.clusterId === 'string' ? state.clusterId : null;
		}
		this.hasState = true;
		this.shownTitle = this.getDisplayText();
		this.render();
		await super.setState(
			state,
			result
		);
	}
}