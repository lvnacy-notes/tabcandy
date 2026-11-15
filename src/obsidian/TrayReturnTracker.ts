/** @file Puts a Tray back in its slot when the member opened from it is closed. */
import {
	App,
	TFile,
	WorkspaceLeaf,
	WorkspaceParent
} from 'obsidian';
import SettingsStore from '../settings/SettingsStore';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

interface PendingReturn {
	clusterId: string;
	leaf: WorkspaceLeaf;
	parent: WorkspaceParent;
	siblings: WorkspaceLeaf[];
}

/**
 * Remembers each Tray that was replaced by one of its members. When that member's leaf is destroyed, opens a new Tray leaf in the slot. Never intercepts the close and never resurrects the old leaf.
 */
export default class TrayReturnTracker {
	private readonly app: App;
	private pending: PendingReturn[] = [];
	private readonly settingsStore: SettingsStore;

	/**
	 * @param app - The Obsidian app.
	 * @param settingsStore - Store holding the Clusters.
	 */
	constructor(app: App, settingsStore: SettingsStore) {
		this.app = app;
		this.settingsStore = settingsStore;
	}

	/**
	 * Opens a member in the Tray's own leaf and remembers the slot so the Tray can return to it. Does nothing when the file is missing.
	 *
	 * @param leaf - The leaf showing the Tray.
	 * @param clusterId - Id of the Tray's Cluster.
	 * @param path - Vault-relative path of the member.
	 */
	async openMember(
		leaf: WorkspaceLeaf,
		clusterId: string,
		path: string
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			return;
		}

		this.pending.push({
			clusterId,
			leaf,
			parent: leaf.parent,
			siblings: this.getLeavesIn(leaf.parent),
		});
		await leaf.openFile(file);
	}

	/** Opens a Tray in the slot of each remembered leaf that no longer exists. Call on `layout-change`. */
	async handleLayoutChange(): Promise<void> {
		if (!this.app.workspace.layoutReady) {
			return;
		}

		const alive = new Set<WorkspaceLeaf>();
		this.app.workspace.iterateAllLeaves((leaf) => {
			alive.add(leaf);
		});

		const gone = this.pending.filter((entry) => !alive.has(entry.leaf));
		if (gone.length === 0) {
			return;
		}
		this.pending = this.pending.filter((entry) => alive.has(entry.leaf));

		for (const entry of gone) {
			if (this.settingsStore.get().clusters[entry.clusterId] === undefined) {
				continue;
			}
			await this.getSlotLeaf(entry).setViewState({
				type: CLUSTER_TRAY_VIEW_TYPE,
				active: true,
				state: { clusterId: entry.clusterId },
			});
		}
	}

	/**
	 * Lists the leaves that share a parent, in layout order.
	 *
	 * @param parent - The parent.
	 * @returns The leaves.
	 */
	private getLeavesIn(parent: WorkspaceParent): WorkspaceLeaf[] {
		const leaves: WorkspaceLeaf[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.parent === parent) {
				leaves.push(leaf);
			}
		});
		return leaves;
	}

	/**
	 * Picks the leaf for the returning Tray: the empty leaf Obsidian left in the slot, otherwise a new tab beside the tab that came before the slot.
	 *
	 * @param entry - The remembered leaf.
	 * @returns The leaf to open the Tray in.
	 */
	private getSlotLeaf(entry: PendingReturn): WorkspaceLeaf {
		const current = this.getLeavesIn(entry.parent);
		const empty = current.find((leaf) => leaf.getViewState().type === 'empty');
		if (empty) {
			return empty;
		}

		const slot = entry.siblings.indexOf(entry.leaf);
		const before = entry.siblings
			.slice(0, Math.max(slot, 0))
			.reverse()
			.find((leaf) => current.includes(leaf));
		const anchor = before ?? current[0];
		if (anchor) {
			this.app.workspace.setActiveLeaf(anchor, { focus: false });
		}
		return this.app.workspace.getLeaf('tab');
	}
}