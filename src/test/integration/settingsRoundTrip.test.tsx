import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { act } from 'react';
import {
	cleanup,
	render,
	screen
} from '@testing-library/react';
import { App as ObsidianApp, WorkspaceLeaf } from 'obsidian';
import {
	createConfiguredApp,
	withEmptyPrivateRegistries
} from '../fakes';
import SettingsStore from '../../settings/SettingsStore';
import { normalizeSettings } from '../../settings/normalizeSettings';
import { TabCandySettings } from '../../types';
import ReactApp from '../../app/App';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A minimal stand-in for the plugin's own `data.json` persistence: an
 * in-memory value plus the same load/save shape the real plugin uses
 * (`normalizeSettings(await this.loadData())` on load, `this.saveData()`
 * on save). Building a second, independent `SettingsStore` against
 * whatever's currently in here is what makes this an actual reload rather
 * than a live update against the same store instance.
 */
function buildFakeDisk(initial: TabCandySettings) {
	let onDisk: unknown = initial;

	return {
		load: (): Promise<TabCandySettings> => Promise.resolve(normalizeSettings(onDisk)),
		save: (settings: TabCandySettings): Promise<void> => {
			onDisk = settings;
			return Promise.resolve();
		},
	};
}

function buildApp(): ObsidianApp {
	return withEmptyPrivateRegistries(createConfiguredApp({ files: {} }));
}

function buildLeaf(app: ObsidianApp): WorkspaceLeaf {
	return app.workspace.getLeaf(true);
}

describe('settings save -> reload -> render round trip', () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('renders a freshly loaded store reflecting a value saved by an earlier one', async () => {
		const app = buildApp();
		const disk = buildFakeDisk(normalizeSettings({}));
		const firstRunStore = new SettingsStore(await disk.load(), disk.save);

		// Simulates a settings change made in one Obsidian session...
		await act(async () => {
			await firstRunStore.update({ greetingText: 'Ahoy, Sailor!' });
		});

		// ...followed by a fresh plugin load in a later session: a brand new
		// SettingsStore instance, built the same way the real plugin builds
		// one at startup, reading back whatever the first store persisted.
		const reloadedStore = new SettingsStore(await disk.load(), disk.save);
		render(
			<ReactApp app = { app } settingsStore = { reloadedStore } leaf = { buildLeaf(app) } />
		);

		expect(screen.getByText(/Ahoy, Sailor!/)).not.toBeNull();
	});

	it('re-renders live when the same store is updated after mount', async () => {
		const app = buildApp();
		const disk = buildFakeDisk(normalizeSettings({}));
		const settingsStore = new SettingsStore(await disk.load(), disk.save);
		render(
			<ReactApp app = { app } settingsStore = { settingsStore } leaf = { buildLeaf(app) } />
		);
		expect(screen.queryByText(/Ahoy, Sailor!/)).toBeNull();

		await act(async () => {
			await settingsStore.update({ greetingText: 'Ahoy, Sailor!' });
		});

		expect(screen.getByText(/Ahoy, Sailor!/)).not.toBeNull();
	});

	it('persists the change to disk as part of the same round trip', async () => {
		const app = buildApp();
		const disk = buildFakeDisk(normalizeSettings({}));
		const settingsStore = new SettingsStore(await disk.load(), disk.save);
		render(
			<ReactApp app = { app } settingsStore = { settingsStore } leaf = { buildLeaf(app) } />
		);

		await act(async () => {
			await settingsStore.update({ greetingText: 'Ahoy, Sailor!' });
		});
		const reloaded = await disk.load();

		expect(reloaded.greetingText).toBe('Ahoy, Sailor!');
	});

	it('removes a rendered section when the setting toggling it off is saved and reloaded', async () => {
		const app = buildApp();
		const disk = buildFakeDisk(normalizeSettings({}));
		const firstRunStore = new SettingsStore(await disk.load(), disk.save);
		render(
			<ReactApp app = { app } settingsStore = { firstRunStore } leaf = { buildLeaf(app) } />
		);
		expect(document.querySelector('.tabcandy-time')).not.toBeNull();

		await act(async () => {
			await firstRunStore.update({ showTime: false });
		});
		cleanup();

		const reloadedStore = new SettingsStore(await disk.load(), disk.save);
		render(
			<ReactApp app = { app } settingsStore = { reloadedStore } leaf = { buildLeaf(app) } />
		);

		expect(document.querySelector('.tabcandy-time')).toBeNull();
	});
});
