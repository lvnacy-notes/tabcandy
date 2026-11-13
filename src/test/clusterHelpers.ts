/** @file Helpers shared by the Cluster tests. */
import {
	App,
	Command,
	WorkspaceLeaf
} from 'obsidian';
import { vi } from 'vitest';
import { addRootLeaf } from './FakeWorkspace';
import { createFakeLeaf } from './FakeWorkspaceLeaf';
import { buildClusters, buildSettings } from './fakes';
import SettingsStore from '../settings/SettingsStore';
import {
	ClusterDraft,
	PromptForCluster,
	PromptForClusterChoice,
	PromptForClusterRemoval,
	TabCandyCluster
} from '../types';

/**
 * Adds a file-backed root leaf to the workspace, creating the file in
 * the vault if it isn't there.
 *
 * @param app - The fake app.
 * @param file - File path the leaf shows.
 * @param pane - The pane the leaf belongs to.
 * @returns The leaf.
 */
export async function addFileTab(
	app: App,
	file: string,
	pane: object
): Promise<WorkspaceLeaf> {
	if (app.vault.getAbstractFileByPath(file) === null) {
		const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
		if (folder !== '' && app.vault.getAbstractFileByPath(folder) === null) {
			await app.vault.createFolder(folder);
		}
		await app.vault.create(file, '');
	}
	const leaf = createFakeLeaf(app);
	await leaf.setViewState({ type: 'markdown', state: { file } });
	Object.defineProperty(leaf, 'parent', { value: pane, configurable: true });
	addRootLeaf(app, leaf);
	return leaf;
}

/**
 * Adds a root leaf with no file, such as a Tab Candy view.
 *
 * @param app - The fake app.
 * @param pane - The pane the leaf belongs to.
 * @returns The leaf.
 */
export async function addNonFileTab(app: App, pane: object): Promise<WorkspaceLeaf> {
	const leaf = createFakeLeaf(app);
	await leaf.setViewState({ type: 'tabcandy-react-view', state: {} });
	Object.defineProperty(leaf, 'parent', { value: pane, configurable: true });
	addRootLeaf(app, leaf);
	return leaf;
}

/**
 * Builds a store holding no Clusters.
 *
 * @returns The store.
 */
export function buildStore(): SettingsStore {
	return new SettingsStore(buildSettings(), async () => {});
}

/**
 * Builds a store holding the given Clusters.
 *
 * @param clusters - The Clusters to hold.
 * @returns The store.
 */
export function buildStoreWith(...clusters: TabCandyCluster[]): SettingsStore {
	return new SettingsStore(buildSettings({ clusters: buildClusters(...clusters) }), async () => {});
}

/**
 * A prompt that is cancelled: it never submits.
 *
 * @returns The prompt and a spy on it.
 */
export function cancelling(): {
	prompt: PromptForCluster;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn<PromptForCluster>();
	return { prompt: spy, spy };
}

/**
 * A prompt that chooses the Cluster `id` immediately.
 *
 * @param id - The id to submit.
 * @returns The prompt and a spy on it.
 */
export function choosing(id: string): {
	prompt: PromptForClusterChoice;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn((_clusters: TabCandyCluster[], onSubmit: (id: string) => void) => onSubmit(id));
	return { prompt: spy, spy };
}

/**
 * A prompt for adding that is cancelled: it never submits.
 *
 * @returns The prompt and a spy on it.
 */
export function choosingNothing(): {
	prompt: PromptForClusterChoice;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn<PromptForClusterChoice>();
	return { prompt: spy, spy };
}

/**
 * Runs a command's availability check.
 *
 * @param command - The command.
 * @returns Whether the command is available.
 */
export function isAvailable(command: Command): boolean {
	return command.checkCallback?.(true) === true;
}

/**
 * A prompt that selects the Clusters `ids` immediately.
 *
 * @param ids - The ids to submit.
 * @returns The prompt and a spy on it.
 */
export function selecting(ids: string[]): {
	prompt: PromptForClusterRemoval;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn((_clusters: TabCandyCluster[], onSubmit: (ids: string[]) => void) => onSubmit(ids));
	return { prompt: spy, spy };
}

/**
 * A prompt for removing that is cancelled: it never submits.
 *
 * @returns The prompt and a spy on it.
 */
export function selectingNothing(): {
	prompt: PromptForClusterRemoval;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn<PromptForClusterRemoval>();
	return { prompt: spy, spy };
}

/**
 * A prompt that submits `draft` immediately.
 *
 * @param draft - The details to submit.
 * @returns The prompt and a spy on it.
 */
export function submitting(draft: ClusterDraft): {
	prompt: PromptForCluster;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn((onSubmit: (draft: ClusterDraft) => void) => onSubmit(draft));
	return { prompt: spy, spy };
}