import { Plugin } from 'obsidian';
import { startRuntime } from './src/runtime';
import SettingsStore from './src/settings/SettingsStore';
import { normalizeSettings } from './src/settings/normalizeSettings';
import type { TabCandySettings } from './src/types';

/** Reloads Obsidian on every rebuild. Development builds only. */
if (process.env.NODE_ENV === 'development') {
	new EventSource('http://127.0.0.1:8000/esbuild').addEventListener(
		'change',
		() => location.reload()
	);
}

/** Plugin entry point: loads settings, then starts the runtime. */
export default class TabCandyPlugin extends Plugin {
	/** Source of truth for settings. Assigned in `onload()` before anything reads it. */
	settingsStore!: SettingsStore;

	/** Read-only mirror of `settingsStore.get()`. Write through `settingsStore.update()`, never here. */
	settings!: TabCandySettings;

	/** Loads settings and mirrors them into `settings`, then starts the runtime. */
	async onload() {
		await this.loadSettings();

		this.settings = this.settingsStore.get();
		this.settingsStore.subscribe((settings) => {
			this.settings = settings;
		});

		await startRuntime(this);
	}

	/** Loads `data.json`, validates it with `normalizeSettings()`, and builds `settingsStore` from the result. */
	async loadSettings() {
		// Raw stored data; unvalidated until normalized.
		const data: unknown = (await this.loadData()) ?? {};
		const normalized = normalizeSettings(data);
		this.settingsStore = new SettingsStore(
			normalized,
			(settings) => this.saveData(settings)
		);
	}
}