/** @file The reading companion: one tab, in reading view, that follows a Cluster. */
import {
	App,
	EventRef,
	WorkspaceLeaf
} from 'obsidian';
import { getTabPath } from '../tabs/tabPaths';
import { getClustersContainingPath } from '../clusters/clusters';
import SettingsStore from '../settings/SettingsStore';
import type { PromptForClusterChoice } from '../types';

/**
 * Keeps one tab, in reading view, pointed at whichever member of a Cluster was last active.
 * Held in memory only. It is cleared when its tab closes, its Cluster is deleted or the plugin unloads.
 */
export default class ReadingCompanion {
	private readonly app: App;
	private readonly settingsStore: SettingsStore;
	private leaf: WorkspaceLeaf | null = null;
	private clusterId: string | null = null;

	/**
	 * @param app - The Obsidian app.
	 * @param settingsStore - Store holding the Clusters.
	 */
	constructor(app: App, settingsStore: SettingsStore) {
		this.app = app;
		this.settingsStore = settingsStore;
	}

	/**
	 * Whether a companion is set.
	 *
	 * @returns True while a companion is set.
	 */
	isSet(): boolean {
		return this.leaf !== null;
	}

	/**
	 * Whether `leaf` can become the companion: a root, file-backed tab while a Cluster exists.
	 *
	 * @param leaf - The tab, or null for none.
	 * @returns True when it can.
	 */
	canSet(leaf: WorkspaceLeaf | null | undefined): leaf is WorkspaceLeaf {
		return leaf !== null
			&& leaf !== undefined
			&& this.isRoot(leaf)
			&& getTabPath(leaf) !== null
			&& Object.keys(this.settingsStore.get().clusters).length > 0;
	}

	/**
	 * Asks which Cluster `leaf` should follow, offering the one that holds its file first when exactly one does, then sets it.
	 *
	 * @param prompt - Collects the choice of Cluster.
	 * @param leaf - The tab to make the companion.
	 */
	promptAndSet(prompt: PromptForClusterChoice, leaf: WorkspaceLeaf): void {
		const path = getTabPath(leaf);
		if (path === null || !this.canSet(leaf)) {
			return;
		}

		const { clusters } = this.settingsStore.get();
		const holders = getClustersContainingPath(
			clusters,
			path
		);
		const all = Object.values(clusters);
		const ordered = holders.length === 1 ? [
			holders[0],
			...all.filter((cluster) => cluster.id !== holders[0].id)
		] : all;

		prompt(
			ordered,
			(id) => {
				void this.set(
					leaf,
					id
				);
			},
			{
				action: 'Set',
				title: 'Set reading companion'
			}
		);
	}

	/**
	 * Makes `leaf` the companion of the Cluster `id` and switches it to reading view. Replaces any earlier companion.
	 *
	 * @param leaf - The tab.
	 * @param id - Id of the Cluster to follow.
	 */
	async set(leaf: WorkspaceLeaf, id: string): Promise<void> {
		this.leaf = leaf;
		this.clusterId = id;

		const viewState = leaf.getViewState();
		await leaf.setViewState({
			...viewState,
			state: {
				...viewState.state,
				mode: 'preview'
			}
		});
	}

	/** Unsets the companion. Its tab stays open in reading view. */
	clear(): void {
		this.leaf = null;
		this.clusterId = null;
	}

	/**
	 * Starts following and clearing. Call once.
	 *
	 * @param registerEvent - Registers a workspace event with the owning component.
	 * @param registerCleanup - Registers a function to run when the owning component unloads.
	 */
	register(
		registerEvent: (eventRef: EventRef) => void,
		registerCleanup: (cleanup: () => void) => void
	): void {
		registerEvent(this.app.workspace.on(
			'active-leaf-change',
			(leaf) => this.follow(leaf)
		));

		registerEvent(this.app.workspace.on(
			'layout-change',
			() => {
				if (this.leaf !== null && !this.isRoot(this.leaf)) {
					this.clear();
				}
			}
		));

		const unsubscribe = this.settingsStore.subscribe(({ clusters }) => {
			if (this.clusterId !== null && clusters[this.clusterId] === undefined) {
				this.clear();
			}
		});

		registerCleanup(() => {
			unsubscribe();
			this.clear();
		});
	}

	/**
	 * Points the companion at `leaf` when it is a root, file-backed tab other than the companion and its file is a member of the followed Cluster. Otherwise does nothing.
	 *
	 * @param leaf - The newly active leaf.
	 */
	private follow(leaf: WorkspaceLeaf | null): void {
		if (this.leaf === null || this.clusterId === null || leaf === null || leaf === this.leaf || !this.isRoot(leaf)) {
			return;
		}

		const path = getTabPath(leaf);
		const cluster = this.settingsStore.get().clusters[this.clusterId];
		if (path === null || !cluster?.members.includes(path)) {
			return;
		}

		this.leaf.setGroupMember(leaf);
	}

	/**
	 * Whether `leaf` is one of the workspace's root leaves.
	 *
	 * @param leaf - The leaf.
	 * @returns True when it is.
	 */
	private isRoot(leaf: WorkspaceLeaf): boolean {
		let found = false;
		this.app.workspace.iterateRootLeaves((candidate) => {
			if (candidate === leaf) {
				found = true;
			}
		});
		return found;
	}
}