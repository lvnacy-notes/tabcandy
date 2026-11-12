import {
	App,
	ColorComponent,
	Modal,
	Setting
} from 'obsidian';
import {
	ClusterDraft,
	UNTITLED_CLUSTER_NAME
} from '../types';

/** Color the swatch shows while no Flavor is set. */
const UNSET_SWATCH_COLOR = '#808080';

/** Collects a Cluster's name and optional Flavor. */
export default class CreateClusterModal extends Modal {
	_onSubmit: (draft: ClusterDraft) => void;
	_name: string = '';
	_flavor: string | undefined = undefined;

	/**
	 * @param app - The Obsidian app.
	 * @param onSubmit - Called with the entered details when the user confirms.
	 */
	constructor(app: App, onSubmit: (draft: ClusterDraft) => void) {
		super(app);
		this._onSubmit = onSubmit;
	}

	/** Builds the name field, Flavor picker and buttons. */
	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Create cluster' });

		new Setting(contentEl)
			.setName('Name')
			.addText((text) => {
				text.setPlaceholder(UNTITLED_CLUSTER_NAME);
				text.onChange((value) => {
					this._name = value;
				});
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter' && !event.isComposing) {
						event.preventDefault();
						this.submit();
					}
				});
			});

		let swatch: ColorComponent | undefined;
		new Setting(contentEl)
			.setName('Flavor')
			.setDesc('Optional. Colors the cluster\'s header.')
			.addColorPicker((color) => {
				swatch = color;
				color.setValue(UNSET_SWATCH_COLOR);
				color.onChange((value) => {
					this._flavor = value;
				});
			})
			.addExtraButton((button) => {
				button.setIcon('reset');
				button.setTooltip('Clear color');
				button.onClick(() => {
					swatch?.setValue(UNSET_SWATCH_COLOR);
					this._flavor = undefined;
				});
			});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText('Create');
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

	/** Passes the entered details to `onSubmit`, then closes. */
	submit(): void {
		this._onSubmit({
			name: this._name.trim(),
			flavor: this._flavor,
		});
		this.close();
	}
}