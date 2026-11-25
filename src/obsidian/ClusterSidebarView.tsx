/** @file The Obsidian view that hosts the Cluster sidebar. */
import { WorkspaceLeaf } from 'obsidian';
import { ReactItemView } from './ReactItemView';
import ClusterSidebar from '../app/ClusterSidebar';
import { buildSidebarHandlers } from '../clusters/sidebarHandlers';
import {
	CLUSTER_SIDEBAR_VIEW_TYPE,
	type CommandDependencies
} from '../types';

/** The Cluster sidebar. Renders the React sidebar into its content element. */
export class ClusterSidebarView extends ReactItemView {
	dependencies: CommandDependencies;
	protected readonly hostClass = 'tabcandy-sidebar';

	/**
	 * @param dependencies - What the sidebar needs from the plugin.
	 * @param leaf - The leaf hosting the view.
	 */
	constructor(
		dependencies: CommandDependencies,
		leaf: WorkspaceLeaf
	) {
		super(leaf);
		this.dependencies = dependencies;
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

	/** @returns The Cluster sidebar. */
	protected renderApp() {
		return <ClusterSidebar
			app = { this.app }
			settingsStore = { this.dependencies.settingsStore }
			{ ...buildSidebarHandlers(this.dependencies) }
		/>;
	}
}