import {
	App,
	FuzzySuggestModal,
	TFile
} from 'obsidian';
import { BACKGROUND_IMAGE_EXTENSIONS } from '../types';

class ChooseImageSuggestModal extends FuzzySuggestModal<TFile> {
	onSubmit: (result: TFile) => void;

	constructor(app: App, onSubmit: (result: TFile) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	/** Gets all supported image types from the vault. */
	getItems(): TFile[] {
		return this.app.vault
			.getFiles()
			.filter((f) =>
				BACKGROUND_IMAGE_EXTENSIONS.includes(f.extension.toLowerCase())
			);
	}

	getItemText(item: TFile): string {
		return item.name;
	}

	onChooseItem(item: TFile, _evt: MouseEvent | KeyboardEvent): void {
		this.onSubmit(item);
		this.close();
	}
}

export default ChooseImageSuggestModal;