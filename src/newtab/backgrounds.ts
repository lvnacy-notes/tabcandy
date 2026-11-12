import {
	App,
	TAbstractFile,
	TFile,
	normalizePath
} from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import { BACKGROUND_IMAGE_EXTENSIONS } from '../types';

/**
 * Keeps the paths that resolve to a file in the vault.
 *
 * @param app - The Obsidian app.
 * @param paths - Vault-relative paths.
 * @returns The paths that still resolve, in their original order.
 */
export function filterExistingFiles(app: App, paths: string[]): string[] {
	return paths.filter(
		(path) =>
			app.vault.getAbstractFileByPath(normalizePath(path)) instanceof
			TFile
	);
}

/**
 * Resolves a vault-relative path to a URL usable in `<img src>` or a CSS
 * `background-image`.
 *
 * @param app - The Obsidian app.
 * @param path - Vault-relative file path.
 * @returns The resource URL.
 */
export function getBackgroundResourcePath(app: App, path: string): string {
	return app.vault.adapter.getResourcePath(normalizePath(path));
}

/**
 * Tests whether a file is a direct child of the backgrounds folder.
 *
 * @param file - The vault file or folder.
 * @param backgroundsFolder - Vault-relative folder path. Empty means none is set.
 * @returns True when `file` is directly inside the folder; always false when no folder is set.
 */
export function isInBackgroundsFolder(
	file: TAbstractFile,
	backgroundsFolder: string
): boolean {
	if (!backgroundsFolder) {return false;}
	return file.parent?.path === normalizePath(backgroundsFolder);
}

/**
 * Lists the image files directly inside a folder, without recursing.
 * Logs and returns an empty array when the path is empty, missing or unreadable.
 *
 * @param app - The Obsidian app.
 * @param folderPath - Vault-relative folder path.
 * @returns Vault-relative image paths, sorted.
 */
export async function listBackgroundFilesInFolder(
	app: App,
	folderPath: string
): Promise<string[]> {
	if (!folderPath) {
		return [];
	}

	const normalizedPath = normalizePath(folderPath);

	try {
		const { files } = await app.vault.adapter.list(normalizedPath);

		return files
			.filter((filePath) => {
				const extension = filePath.split('.').pop()?.toLowerCase();
				return (
					!!extension &&
					BACKGROUND_IMAGE_EXTENSIONS.includes(extension)
				);
			})
			.sort();
	} catch (error) {
		console.error(
			`Tab Candy: could not read background images folder "${normalizedPath}"`,
			error
		);
		return [];
	}
}

/**
 * Drops `manualBackgroundFiles` entries that no longer resolve to a vault
 * file. Saves only when an entry was dropped.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 */
export async function pruneMissingManualBackgroundFiles(
	app: App,
	settingsStore: SettingsStore
): Promise<void> {
	const current = settingsStore.get().manualBackgroundFiles;
	const manualBackgroundFiles = filterExistingFiles(app, current);
	if (manualBackgroundFiles.length !== current.length) {
		await settingsStore.update({ manualBackgroundFiles });
	}
}

/**
 * Drops `overlayTextContrastCache` entries whose file is gone or whose
 * modified time no longer matches the entry. Saves only when an entry was
 * dropped.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 */
export async function pruneStaleOverlayContrastCache(
	app: App,
	settingsStore: SettingsStore
): Promise<void> {
	const current = settingsStore.get().overlayTextContrastCache;
	const pruned: typeof current = {};
	let changed = false;

	for (const [path, entry] of Object.entries(current)) {
		const file = app.vault.getAbstractFileByPath(normalizePath(path));
		if (file instanceof TFile && file.stat.mtime === entry.mtime) {
			pruned[path] = entry;
		} else {
			changed = true;
		}
	}

	if (changed) {
		await settingsStore.update({ overlayTextContrastCache: pruned });
	}
}

/**
 * Writes the image files found in the configured backgrounds folder to
 * `backgroundFiles`. Writes an empty list when no folder is set.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the settings.
 */
export async function syncBackgroundsFolder(
	app: App,
	settingsStore: SettingsStore
): Promise<void> {
	const backgroundFiles = await listBackgroundFilesInFolder(
		app,
		settingsStore.get().backgroundsFolder
	);
	await settingsStore.update({ backgroundFiles });
}