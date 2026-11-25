/** @file The Obsidian view that hosts the new-tab app. */
import { WorkspaceLeaf } from 'obsidian';
import { ReactItemView } from './ReactItemView';
import ReactApp from '../app/App';
import SettingsStore from '../settings/SettingsStore';
import { TAB_CANDY_VIEW_TYPE } from '../types';

/** The new-tab view. Renders the React app into its content element. */
export class TabCandyView extends ReactItemView {
	settingsStore: SettingsStore;
	protected readonly hostClass = 'tabcandy';

	/**
	 * @param settingsStore - Store holding the settings.
	 * @param leaf - The leaf hosting the view.
	 */
	constructor(
		settingsStore: SettingsStore,
		leaf: WorkspaceLeaf
	) {
		super(leaf);
		this.settingsStore = settingsStore;
		this.navigation = true;
	}

	/** @returns The tab's title. */
	getDisplayText() {
		return 'New tab';
	}

	/** @returns The tab's icon id; empty for none. */
	getIcon() {
		return '';
	}

	/** @returns The view type id. */
	getViewType() {
		return TAB_CANDY_VIEW_TYPE;
	}

	/** @returns The new-tab app. */
	protected renderApp() {
		return <ReactApp
			app = { this.app }
			settingsStore = { this.settingsStore }
			leaf = { this.leaf }
		/>;
	}
}