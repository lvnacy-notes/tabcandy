/** @file Modal that picks one Cluster from a list. */
import {
	App,
	Modal,
	Setting
} from 'obsidian';
import type {
	ChooseClusterLabels,
	TabCandyCluster
} from '../types';

/** Asks which of a set of Clusters to use. */
export default class ChooseClusterModal extends Modal {
	_clusters: TabCandyCluster[];
	_labels: ChooseClusterLabels;
	_onSubmit: (id: string) => void;
	_selectedId: string;

	/**
	 * @param app - The Obsidian app.
	 * @param clusters - The Clusters to choose from; the first is selected.
	 * @param onSubmit - Called with the chosen Cluster's id when the user confirms.
	 * @param labels - The heading and confirm button text. Defaults to the wording for adding to a Cluster.
	 */
	constructor(
		app: App,
		clusters: TabCandyCluster[],
		onSubmit: (id: string) => void,
		labels: ChooseClusterLabels = {
			action: 'Add',
			title: 'Add to cluster'
		}
	) {
		super(app);
		this._clusters = clusters;
		this._labels = labels;
		this._onSubmit = onSubmit;
		this._selectedId = clusters[0]?.id ?? '';
	}

	/** Builds the Cluster dropdown and buttons. */
	onOpen() {
		const { contentEl } = this;

		contentEl.createEl(
			'h2',
			{ text: this._labels.title }
		);

		new Setting(contentEl)
			.setName('Cluster')
			.addDropdown((dropdown) => {
				for (const cluster of this._clusters) {
					dropdown.addOption(
						cluster.id,
						cluster.name
					);
				}
				dropdown.setValue(this._selectedId);
				dropdown.onChange((value) => {
					this._selectedId = value;
				});
			});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText(this._labels.action);
				button.setCta();
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

	/** Passes the chosen id to `onSubmit`, then closes. */
	submit(): void {
		this._onSubmit(this._selectedId);
		this.close();
	}
}