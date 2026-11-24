/** @file Modal that resolves or removes a Cluster's missing members. */
import {
	App,
	Modal,
	Notice,
	Setting,
	TFile
} from 'obsidian';
import FileInputSuggest from './FileInputSuggest';
import {
	removeMissingMembers,
	resolveMissingMember
} from '../clusters/clusterMembership';
import { getMissingMembers } from '../clusters/clusters';
import SettingsStore from '../settings/SettingsStore';

/** Lists a Cluster's missing members, each with a file search, and a button that removes them all. */
export default class ResolveMissingModal extends Modal {
	_clusterId: string;
	_focusPath: string | undefined;
	_settingsStore: SettingsStore;

	/**
	 * @param app - The Obsidian app.
	 * @param settingsStore - Store holding the Clusters.
	 * @param clusterId - Id of the Cluster.
	 * @param focusPath - Missing path whose search field starts focused.
	 */
	constructor(
		app: App,
		settingsStore: SettingsStore,
		clusterId: string,
		focusPath?: string
	) {
		super(app);
		this._settingsStore = settingsStore;
		this._clusterId = clusterId;
		this._focusPath = focusPath;
	}

	/** @returns The Cluster's members whose files don't exist. */
	getMissing(): string[] {
		const cluster = this._settingsStore.get().clusters[this._clusterId];
		if (cluster === undefined) {
			return [];
		}

		return getMissingMembers(
			cluster,
			(path) => this.app.vault.getAbstractFileByPath(path) instanceof TFile
		);
	}

	/** Clears the modal's content. */
	onClose() {
		this.contentEl.empty();
	}

	/** Builds the list of missing members. */
	onOpen() {
		this.render();
	}

	/** Removes every missing member from the Cluster and closes. */
	async removeAll(): Promise<void> {
		await removeMissingMembers(
			this._settingsStore,
			this._clusterId,
			this.getMissing()
		);
		this.close();
	}

	/** Rebuilds the list from the current missing members. Closes when none are left. */
	render(): void {
		const { contentEl } = this;
		contentEl.empty();

		const missing = this.getMissing();
		if (missing.length === 0) {
			this.close();
			return;
		}

		contentEl.createEl(
			'h2',
			{ text: 'Resolve missing members' }
		);

		for (const path of missing) {
			new Setting(contentEl)
				.setName(path)
				.setDesc('Pick the file to use instead.')
				.addText((text) => {
					text.setPlaceholder('Search for a file');
					new FileInputSuggest(
						this.app,
						text.inputEl,
						(file) => {
							void this.resolve(
								path,
								file
							);
						}
					);
					if (path === this._focusPath) {
						text.inputEl.focus();
					}
				});
		}

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('Remove all missing');
				button.setDestructive();
				button.onClick(() => {
					void this.removeAll();
				});
			})
			.addButton((button) => {
				button.setButtonText('Close');
				button.onClick(() => {
					this.close();
				});
			});
	}

	/**
	 * Replaces a missing path of this modal's Cluster with the picked file, then rebuilds the list.
	 * Shows a notice and replaces nothing when the Cluster already holds the file.
	 *
	 * @param stalePath - The missing member path.
	 * @param file - The file to use instead.
	 */
	async resolve(stalePath: string, file: TFile): Promise<void> {
		if (this._settingsStore.get().clusters[this._clusterId]?.members.includes(file.path)) {
			new Notice('Already in this cluster.');
			this.render();
			return;
		}

		await resolveMissingMember(
			this._settingsStore,
			this._clusterId,
			stalePath,
			file.path
		);
		this.render();
	}
}