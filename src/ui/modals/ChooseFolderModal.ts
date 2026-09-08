import {
	App,
	FuzzySuggestModal,
	TFolder
} from 'obsidian';

export default class ChooseFolderModal extends FuzzySuggestModal<TFolder> {
	onSubmit: (result: TFolder) => void;

	constructor(app: App, onSubmit: (result: TFolder) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	/**
	 * Every folder in the vault, including the root - the root is
	 * offered explicitly since Vault.getAllLoadedFiles() includes it as
	 * a TFolder with an empty `path`, which getItemText below renders
	 * as "/" rather than a confusing blank row.
	 */
	getItems(): TFolder[] {
		return this.app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => file instanceof TFolder);
	}

	getItemText(item: TFolder): string {
		return item.path || '/';
	}

	onChooseItem(item: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.onSubmit(item);
		this.close();
	}
}