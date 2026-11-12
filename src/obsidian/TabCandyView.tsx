import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import ReactApp from '../app/App';
import SettingsStore from '../settings/SettingsStore';
import { TAB_CANDY_VIEW_TYPE } from '../types';

/** The new-tab view. Renders the React app into its content element. */
export class TabCandyView extends ItemView {
	root: Root | null = null;
	settingsStore: SettingsStore;

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

	/** Replaces any existing content with a fresh React root. */
	onOpen(): Promise<void> {
		this.contentEl.empty();

		this.root = createRoot(this.contentEl);
		this.root.render(
			<ReactApp
				app = { this.app }
				settingsStore = { this.settingsStore }
				leaf = { this.leaf }
			/>
		);
		this.containerEl.addClass('tabcandy');

		return Promise.resolve();
	}

	/** Unmounts the React root. */
	onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;

		return Promise.resolve();
	}
}