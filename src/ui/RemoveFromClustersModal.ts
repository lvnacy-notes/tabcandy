/** @file Modal that picks any of a list of Clusters to remove a file from. */
import {
	App,
	Modal,
	Setting
} from 'obsidian';
import type { TabCandyCluster } from '../types';

/** Asks which of a set of Clusters to remove a file from. */
export default class RemoveFromClustersModal extends Modal {
	_clusters: TabCandyCluster[];
	_onSubmit: (ids: string[]) => void;
	_selectedIds: Set<string> = new Set();

	/**
	 * @param app - The Obsidian app.
	 * @param clusters - The Clusters to choose from.
	 * @param onSubmit - Called with the checked Clusters' ids when the user confirms.
	 */
	constructor(
		app: App,
		clusters: TabCandyCluster[],
		onSubmit: (ids: string[]) => void
	) {
		super(app);
		this._clusters = clusters;
		this._onSubmit = onSubmit;
	}

	/** Builds one checkbox per Cluster and the buttons. */
	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Remove from cluster' });

		for (const cluster of this._clusters) {
			const setting = new Setting(contentEl).setName(cluster.name);
			const checkbox = setting.controlEl.createEl('input', { type: 'checkbox' });
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this._selectedIds.add(cluster.id);
				} else {
					this._selectedIds.delete(cluster.id);
				}
			});
		}

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('Remove from selected');
				button.setDestructive();
				button.onClick(() => {
					this.submit();
				});
			})
			.addButton((button) => {
				button.setButtonText('Cancel');
				button.onClick(() => {
					this.close();
				});
			});
	}

	/** Clears the modal's content. */
	onClose() {
		this.contentEl.empty();
	}

	/** Passes the checked ids to `onSubmit` and closes. Does nothing when none are checked. */
	submit(): void {
		if (this._selectedIds.size === 0) {
			return;
		}
		this._onSubmit([...this._selectedIds]);
		this.close();
	}
}