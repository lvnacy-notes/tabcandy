/** @file Test data builders and fake app helpers. */
import { App, TAbstractFile } from 'obsidian';
import { App as AppMock } from 'obsidian-test-mocks/obsidian';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import {
	TabCandyCluster,
	TabCandyClusters,
	TabCandySettings
} from '../types';

/**
 * Builds an in-memory app and converts it to the `obsidian` package's `App` type.
 *
 * @param options - Options for the mock app.
 * @returns The app.
 */
export function createConfiguredApp(
	options: Parameters<typeof AppMock.createConfigured__>[0] = {}
): App {
	return AppMock.createConfigured__(options).asOriginalType__();
}

/**
 * Builds settings from the defaults with `overrides` applied.
 *
 * @param overrides - Settings to replace.
 * @returns The settings.
 */
export function buildSettings(
	overrides: Partial<TabCandySettings> = {}
): TabCandySettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

/**
 * Builds a Cluster with valid defaults and `overrides` applied.
 *
 * @param overrides - Fields to replace.
 * @returns The Cluster.
 */
export function buildCluster(
	overrides: Partial<TabCandyCluster> = {}
): TabCandyCluster {
	return {
		id: 'cluster-a',
		name: 'Cluster A',
		members: [],
		lastTouchedAt: 0,
		pairedWith: null,
		...overrides,
	};
}

/**
 * Keys Clusters by their ids.
 *
 * @param clusters - The Clusters.
 * @returns The record.
 */
export function buildClusters(
	...clusters: TabCandyCluster[]
): TabCandyClusters {
	const record: TabCandyClusters = {};
	for (const cluster of clusters) {
		record[cluster.id] = cluster;
	}
	return record;
}

/**
 * Reads a vault file that the test knows exists.
 *
 * @param app - The app.
 * @param path - Vault-relative path.
 * @returns The file.
 * @throws When nothing exists at `path`.
 */
export function getExistingFile(app: App, path: string): TAbstractFile {
	const file = app.vault.getAbstractFileByPath(path);
	if (file === null) {
		throw new Error(`Expected "${ path }" to already exist in the fake vault.`);
	}
	return file;
}

export interface FakeBookmarksPlugin {
	enabled?: boolean;
	instance?: { items?: unknown };
}

export interface FakeCommandsRegistry {
	commands: Record<string, FakeRegisteredCommand | undefined>;
	executeCommandById: (id: string) => boolean;
}

export interface FakeRegisteredCommand {
	id: string;
	name: string;
}

/**
 * Assigns the app's `commands` registry.
 *
 * @param app - The app.
 * @param registry - The registry, or undefined.
 */
export function setCommandsRegistry(
	app: App,
	registry: FakeCommandsRegistry | undefined
): void {
	(
		app as unknown as { commands: FakeCommandsRegistry | undefined }
	).commands = registry;
}

/**
 * Assigns the app's `internalPlugins` registry.
 *
 * @param app - The app.
 * @param plugins - The internal plugins, or undefined.
 */
export function setInternalPluginsRegistry(
	app: App,
	plugins: Record<string, FakeBookmarksPlugin | undefined> | undefined
): void {
	(
		app as unknown as {
			internalPlugins:
				| { plugins: Record<string, FakeBookmarksPlugin | undefined> }
				| undefined;
		}
	).internalPlugins = plugins === undefined ? undefined : { plugins };
}

/**
 * Assigns the app's `plugins` registry.
 *
 * @param app - The app.
 * @param plugins - The plugins, or undefined.
 */
export function setPluginsRegistry(
	app: App,
	plugins: Record<string, unknown> | undefined
): void {
	(
		app as unknown as {
			plugins: { plugins: Record<string, unknown> } | undefined;
		}
	).plugins = plugins === undefined ? undefined : { plugins };
}

/**
 * Assigns empty `commands`, `plugins` and `internalPlugins` registries.
 *
 * @param app - The app.
 * @returns The same app.
 */
export function withEmptyPrivateRegistries(app: App): App {
	setCommandsRegistry(app, { commands: {}, executeCommandById: () => true });
	setPluginsRegistry(app, {});
	setInternalPluginsRegistry(app, {});
	return app;
}