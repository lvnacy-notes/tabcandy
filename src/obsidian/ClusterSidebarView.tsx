import {
	ItemView,
	WorkspaceLeaf
} from 'obsidian';
import {
	Root,
	createRoot
} from 'react-dom/client';
import ClusterSidebar from '../app/clusterSidebar';
import SettingsStore from '../settings/SettingsStore';
import { CLUSTER_SIDEBAR_VIEW_TYPE } from '../types';

/** The Cluster sidebar. Renders the React sidebar into its content element. */
export class ClusterSidebarView extends ItemView {
	onCreateCluster: () => void;
	root: Root | null = null;
	settingsStore: SettingsStore;

	/**
	 * @param settingsStore - Store holding the Clusters.
	 * @param onCreateCluster - Starts creating an empty Cluster.
	 * @param leaf - The leaf hosting the view.
	 */
	constructor(
		settingsStore: SettingsStore,
		onCreateCluster: () => void,
		leaf: WorkspaceLeaf
	) {
		super(leaf);
		this.settingsStore = settingsStore;
		this.onCreateCluster = onCreateCluster;
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

	/** Replaces any existing content with a fresh React root. */
	onOpen(): Promise<void> {
		this.contentEl.empty();

		this.root = createRoot(this.contentEl);
		this.root.render(
			<ClusterSidebar
				app = { this.app }
				settingsStore = { this.settingsStore }
				onCreateCluster = { this.onCreateCluster }
			/>
		);
		this.containerEl.addClass('tabcandy-sidebar');

		return Promise.resolve();
	}

	/** Unmounts the React root. */
	onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;

		return Promise.resolve();
	}
}