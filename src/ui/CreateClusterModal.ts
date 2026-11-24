/** @file The modal that collects a Cluster's name and Flavor, to create it or to edit it. */
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

/** Collects a Cluster's name and optional Flavor. Fills the form from `existing` and offers Save in place of Create when editing. */
export default class CreateClusterModal extends Modal {
	_onSubmit: (draft: ClusterDraft) => void;
	_name: string;
	_flavor: string | undefined;
	_editing: boolean;

	/**
	 * @param app - The Obsidian app.
	 * @param onSubmit - Called with the entered details when the user confirms.
	 * @param existing - The details of the Cluster being edited. Leave out to create one.
	 */
	constructor(
		app: App,
		onSubmit: (draft: ClusterDraft) => void,
		existing?: ClusterDraft
	) {
		super(app);
		this._onSubmit = onSubmit;
		this._editing = existing !== undefined;
		this._name = existing?.name ?? '';
		this._flavor = existing?.flavor;
	}

	/** Builds the name field, Flavor picker and buttons. */
	onOpen() {
		const { contentEl } = this;

		contentEl.createEl(
			'h2',
			{ text: this._editing ? 'Edit cluster' : 'Create cluster' }
		);

		new Setting(contentEl)
			.setName('Name')
			.addText((text) => {
				text.setPlaceholder(UNTITLED_CLUSTER_NAME);
				text.setValue(this._name);
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
				color.setValue(this._flavor === undefined ? UNSET_SWATCH_COLOR : toSwatchColor(this._flavor));
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
				button.setButtonText(this._editing ? 'Save' : 'Create');
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

/**
 * Shows a Flavor as the `#rrggbb` color a color picker accepts: a short color is expanded and an alpha channel is dropped.
 *
 * @param flavor - A hex color of three, six or eight digits.
 * @returns The color as `#rrggbb`.
 */
function toSwatchColor(flavor: string): string {
	if (flavor.length === 4) {
		const [
			r,
			g,
			b
		] = flavor.slice(1);
		return `#${ r }${ r }${ g }${ g }${ b }${ b }`;
	}
	return flavor.slice(
		0,
		7
	);
}