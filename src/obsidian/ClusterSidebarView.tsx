/** @file The Obsidian view that hosts the Cluster sidebar. */
import {
	ItemView,
	WorkspaceLeaf
} from 'obsidian';
import {
	Root,
	createRoot
} from 'react-dom/client';
import ClusterSidebar from '../app/ClusterSidebar';
import SettingsStore from '../settings/SettingsStore';
import { CLUSTER_SIDEBAR_VIEW_TYPE } from '../types';

/** The Cluster sidebar. Renders the React sidebar into its content element. */
export class ClusterSidebarView extends ItemView {
	onConfirmUnlink: (id: string) => void;
	onCreateCluster: () => void;
	onDeleteCluster: (id: string) => void;
	onEditCluster: (id: string) => void;
	onPair: (id: string) => void;
	root: Root | null = null;
	settingsStore: SettingsStore;

	/**
	 * @param settingsStore - Store holding the Clusters.
	 * @param onCreateCluster - Starts creating an empty Cluster.
	 * @param onPair - Starts pairing a Cluster, by id.
	 * @param onConfirmUnlink - Starts unlinking a Cluster after a confirmation, by id.
	 * @param onEditCluster - Starts editing a Cluster, by id.
	 * @param onDeleteCluster - Starts deleting a Cluster after a confirmation, by id.
	 * @param leaf - The leaf hosting the view.
	 */
	constructor(
		settingsStore: SettingsStore,
		onCreateCluster: () => void,
		onPair: (id: string) => void,
		onConfirmUnlink: (id: string) => void,
		onEditCluster: (id: string) => void,
		onDeleteCluster: (id: string) => void,
		leaf: WorkspaceLeaf
	) {
		super(leaf);
		this.settingsStore = settingsStore;
		this.onCreateCluster = onCreateCluster;
		this.onPair = onPair;
		this.onConfirmUnlink = onConfirmUnlink;
		this.onEditCluster = onEditCluster;
		this.onDeleteCluster = onDeleteCluster;
	}

	/** @returns The view's title. */
	getDisplayText() {
		return 'Clusters';
	}

	/** @returns The view's icon id. */
	getIcon() {
		return 'layers';
	}

	/** @returns The view type id. */
	getViewType() {
		return CLUSTER_SIDEBAR_VIEW_TYPE;
	}

	/** Unmounts the React root. */
	onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;

		return Promise.resolve();
	}

	/** Replaces any existing content with a fresh React root. */
	onOpen(): Promise<void> {
		this.contentEl.empty();

		this.root = createRoot(this.contentEl);
		this.root.render(<ClusterSidebar
			app = { this.app }
			settingsStore = { this.settingsStore }
			onConfirmUnlink = { this.onConfirmUnlink }
			onCreateCluster = { this.onCreateCluster }
			onDeleteCluster = { this.onDeleteCluster }
			onEditCluster = { this.onEditCluster }
			onPair = { this.onPair }
		/>);
		this.containerEl.addClass('tabcandy-sidebar');

		return Promise.resolve();
	}
}