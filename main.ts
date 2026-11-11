import { Plugin } from 'obsidian';
import { TabCandyView } from './src/TabCandyView';
import SettingsStore from './src/settings/SettingsStore';
import TabCandySettingTab from './src/obsidian/SettingsTab';
import { TAB_CANDY_VIEW_TYPE, TabCandySettings } from './src/types';
import { normalizeSettings } from './src/settings/normalizeSettings';
import {
	pruneMissingManualBackgroundFiles,
	pruneStaleOverlayContrastCache,
	registerBackgroundVaultWatchers,
	syncBackgroundsFolder,
} from './src/obsidian/backgrounds';
import { registerClusterRenameWatcher } from './src/obsidian/clusters';
import { checkForPluginUpdates } from './src/obsidian/versionCheck';
import { registerQuotesVaultWatcher, syncQuotesFile } from './src/obsidian/quotes';
import { registerNewTabHijack } from './src/obsidian/newTabHijack';
import { registerStackedTabPanes } from './src/obsidian/stackedTabPanes';
import { registerTabCommands } from './src/obsidian/tabCommands';
import { registerTabTracking } from './src/obsidian/tabNavigation';

/** Reloads Obsidian on every rebuild. Development builds only. */
if (process.env.NODE_ENV === 'development') {
	new EventSource('http://127.0.0.1:8000/esbuild').addEventListener(
		'change',
		() => location.reload()
	);
}

/** Plugin entry point: wires settings, views, commands and vault watchers. */
export default class TabCandyPlugin extends Plugin {
	/** Source of truth for settings. Assigned in `onload()` before anything reads it. */
	settingsStore!: SettingsStore;

	/** Read-only mirror of `settingsStore.get()`. Write through `settingsStore.update()`, never here. */
	settings!: TabCandySettings;

	/** Loads settings, then registers the view, settings tab, commands and watchers. */
	async onload() {
		await this.loadSettings();

		this.settings = this.settingsStore.get();
		this.settingsStore.subscribe((settings) => {
			this.settings = settings;
		});

		void checkForPluginUpdates();

		// Tells Style Settings to re-scan this plugin's `@settings` block.
		this.app.workspace.trigger('parse-style-settings');

		// Syncs the backgrounds folder.
		await syncBackgroundsFolder(this.app, this.settingsStore);

		// Drops manually added images deleted or renamed while the plugin wasn't running.
		await pruneMissingManualBackgroundFiles(this.app, this.settingsStore);

		// Drops contrast cache entries whose image was deleted or edited while the plugin wasn't running.
		await pruneStaleOverlayContrastCache(this.app, this.settingsStore);

		registerBackgroundVaultWatchers(
			this.app,
			this.settingsStore,
			(eventRef) => this.registerEvent(eventRef)
		);

		// Syncs the quotes file.
		await syncQuotesFile(this.app, this.settingsStore);

		registerQuotesVaultWatcher(
			this.app,
			this.settingsStore,
			(eventRef) => this.registerEvent(eventRef)
		);

		// Patches Cluster paths on rename. Missing members are kept, not pruned.
		registerClusterRenameWatcher(
			this.app,
			this.settingsStore,
			(eventRef) => this.registerEvent(eventRef)
		);

		this.registerView(
			TAB_CANDY_VIEW_TYPE,
			(leaf) => new TabCandyView(this.settingsStore, leaf)
		);

		this.addSettingTab(new TabCandySettingTab(this.app, this));

		registerNewTabHijack(
			this.app,
			this.settingsStore,
			(eventRef) => this.registerEvent(eventRef)
		);

		registerTabCommands(
			this.app,
			this.settingsStore,
			(command) => this.addCommand(command)
		);

		registerTabTracking(
			this.app,
			(eventRef) => this.registerEvent(eventRef)
		);

		registerStackedTabPanes(
			this.settingsStore,
			(cleanup) => this.register(cleanup)
		);
	}

	/** Loads `data.json`, validates it with `normalizeSettings()`, and builds `settingsStore` from the result. */
	async loadSettings() {
		// `loadData()` returns `any`; `unknown` forces it through normalization.
		const data: unknown = (await this.loadData()) ?? {};
		const normalized = normalizeSettings(data);
		this.settingsStore = new SettingsStore(
			normalized,
			(settings) => this.saveData(settings)
		);
	}
}