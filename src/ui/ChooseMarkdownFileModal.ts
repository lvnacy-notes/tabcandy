import {
	App,
	FuzzySuggestModal,
	TFile
} from 'obsidian';

export default class ChooseMarkdownFileModal extends FuzzySuggestModal<TFile> {
	onSubmit: (result: TFile) => void;

	constructor(app: App, onSubmit: (result: TFile) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	onChooseItem(item: TFile, _evt: MouseEvent | KeyboardEvent): void {
		this.onSubmit(item);
		this.close();
	}
}