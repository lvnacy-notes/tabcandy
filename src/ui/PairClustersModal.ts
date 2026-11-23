/** @file Modal that picks the two Clusters to pair. */
import {
	App,
	DropdownComponent,
	Modal,
	Setting
} from 'obsidian';
import type { TabCandyCluster } from '../types';

/** Asks which Cluster to pair with which. The target list never holds the source. */
export default class PairClustersModal extends Modal {
	_clusters: TabCandyCluster[];
	_onSubmit: (
		sourceId: string,
		targetId: string
	) => void;
	_sourceId: string;
	_targetId: string;

	/**
	 * @param app - The Obsidian app.
	 * @param clusters - The Clusters to choose from; at least two.
	 * @param onSubmit - Called with the source and target ids when the user confirms.
	 */
	constructor(
		app: App,
		clusters: TabCandyCluster[],
		onSubmit: (
			sourceId: string,
			targetId: string
		) => void
	) {
		super(app);
		this._clusters = clusters;
		this._onSubmit = onSubmit;
		this._sourceId = clusters[0]?.id ?? '';
		this._targetId = this.getTargets()[0]?.id ?? '';
	}

	/**
	 * Lists the Clusters the source can be paired with.
	 *
	 * @returns Every Cluster but the source.
	 */
	getTargets(): TabCandyCluster[] {
		return this._clusters.filter((cluster) => cluster.id !== this._sourceId);
	}

	/** Clears the modal's content. */
	onClose() {
		this.contentEl.empty();
	}

	/** Builds the two dropdowns and the buttons. */
	onOpen() {
		const { contentEl } = this;
		let targetDropdown: DropdownComponent | null = null;

		contentEl.createEl(
			'h2',
			{ text: 'Pair clusters' }
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
				dropdown.setValue(this._sourceId);
				dropdown.onChange((value) => {
					this._sourceId = value;
					this._targetId = this.getTargets()[0]?.id ?? '';
					if (targetDropdown !== null) {
						this.fillTargets(targetDropdown);
					}
				});
			});

		new Setting(contentEl)
			.setName('Pair with')
			.addDropdown((dropdown) => {
				targetDropdown = dropdown;
				this.fillTargets(dropdown);
				dropdown.onChange((value) => {
					this._targetId = value;
				});
			});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('Pair');
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

	/**
	 * Replaces the options of the target dropdown with the current targets.
	 *
	 * @param dropdown - The target dropdown.
	 */
	fillTargets(dropdown: DropdownComponent): void {
		dropdown.selectEl.empty();
		for (const cluster of this.getTargets()) {
			dropdown.addOption(
				cluster.id,
				cluster.name
			);
		}
		dropdown.setValue(this._targetId);
	}

	/** Passes the chosen ids to `onSubmit`, then closes. */
	submit(): void {
		this._onSubmit(
			this._sourceId,
			this._targetId
		);
		this.close();
	}
}