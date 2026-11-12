import {
	App,
	EventRef,
	TFile,
	normalizePath
} from 'obsidian';
import { replaceMemberPath } from '../clusters/clusters';
import {
	isInBackgroundsFolder,
	syncBackgroundsFolder
} from '../newtab/backgrounds';
import { syncQuotesFile } from '../newtab/quotes';
import SettingsStore from '../settings/SettingsStore';
import debounce from '../utils/debounce';

/** Milliseconds a burst of vault events is collapsed into one re-sync. */
const SYNC_DEBOUNCE_MS = 500;

/**
 * Keeps `backgroundFiles` and `manualBackgroundFiles` current as vault files
 * change. `create` and `modify` re-sync the backgrounds folder after a
 * debounce. `delete` and `rename` update or drop the affected
 * `manualBackgroundFiles` entry, and re-sync when the file was in, or moved
 * out of, the backgrounds folder.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 * @param registerEvent - Registers each listener with the owning component.
 */
export function registerBackgroundVaultWatchers(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void
): void {
	const debouncedSync = debounce(() => {
		void syncBackgroundsFolder(app, settingsStore);
	}, SYNC_DEBOUNCE_MS);

	registerEvent(
		app.vault.on('create', (file) => {
			if (isInBackgroundsFolder(file, settingsStore.get().backgroundsFolder)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('modify', (file) => {
			if (isInBackgroundsFolder(file, settingsStore.get().backgroundsFolder)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('delete', (file) => {
			const settings = settingsStore.get();
			if (settings.manualBackgroundFiles.includes(file.path)) {
				void settingsStore.update({
					manualBackgroundFiles: settings.manualBackgroundFiles.filter(
						(path) => path !== file.path
					),
				});
			}
			if (isInBackgroundsFolder(file, settings.backgroundsFolder)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('rename', (file, oldPath) => {
			const settings = settingsStore.get();
			if (
				file instanceof TFile &&
				settings.manualBackgroundFiles.includes(oldPath)
			) {
				void settingsStore.update({
					manualBackgroundFiles: settings.manualBackgroundFiles.map(
						(path) => (path === oldPath ? file.path : path)
					),
				});
			}
			const oldParentPath = oldPath.includes('/')
				? oldPath.slice(0, oldPath.lastIndexOf('/'))
				: '';
			if (
				isInBackgroundsFolder(file, settings.backgroundsFolder) ||
				(settings.backgroundsFolder &&
					oldParentPath === normalizePath(settings.backgroundsFolder))
			) {
				debouncedSync();
			}
		})
	);
}

/**
 * Patches Cluster member paths when a vault file is renamed or moved.
 * Deletions are ignored; missing members are kept.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @param registerEvent - Registers the listener with the owning component.
 */
export function registerClusterRenameWatcher(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void
): void {
	registerEvent(
		app.vault.on('rename', (file, oldPath) => {
			const { clusters } = settingsStore.get();
			const next = replaceMemberPath(
				clusters,
				oldPath,
				file.path
			);
			if (next !== clusters) {
				void settingsStore.update({ clusters: next });
			}
		})
	);
}

/**
 * Keeps `fileQuotes` current as the configured quotes file changes. `create`
 * and `modify` re-parse the file after a debounce, `delete` empties
 * `fileQuotes`, and `rename` points `quotesFilePath` at the new path.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 * @param registerEvent - Registers each listener with the owning component.
 */
export function registerQuotesVaultWatcher(
	app: App,
	settingsStore: SettingsStore,
	registerEvent: (eventRef: EventRef) => void
): void {
	const isConfiguredQuotesFile = (path: string): boolean => {
		const { quotesFilePath } = settingsStore.get();
		return !!quotesFilePath && path === normalizePath(quotesFilePath);
	};

	const debouncedSync = debounce(() => {
		void syncQuotesFile(app, settingsStore);
	}, SYNC_DEBOUNCE_MS);

	registerEvent(
		app.vault.on('create', (file) => {
			if (isConfiguredQuotesFile(file.path)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('modify', (file) => {
			if (isConfiguredQuotesFile(file.path)) {
				debouncedSync();
			}
		})
	);

	registerEvent(
		app.vault.on('delete', (file) => {
			if (isConfiguredQuotesFile(file.path)) {
				void settingsStore.update({ fileQuotes: [] });
			}
		})
	);

	registerEvent(
		app.vault.on('rename', (file, oldPath) => {
			if (isConfiguredQuotesFile(oldPath)) {
				void settingsStore.update({ quotesFilePath: file.path });
			}
		})
	);
}