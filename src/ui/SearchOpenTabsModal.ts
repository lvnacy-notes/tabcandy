import {
	App,
	FuzzySuggestModal,
	WorkspaceLeaf
} from 'obsidian';

export default class SearchOpenTabsModal extends FuzzySuggestModal<WorkspaceLeaf> {
	constructor(app: App) {
		super(app);
	}

	getItems(): WorkspaceLeaf[] {
		const leaves: WorkspaceLeaf[] = [];
		this.app.workspace.iterateRootLeaves((leaf) => {
			leaves.push(leaf);
		});
		return leaves;
	}

	getItemText(item: WorkspaceLeaf): string {
		return item.getDisplayText();
	}

	onChooseItem(item: WorkspaceLeaf, _evt: MouseEvent | KeyboardEvent): void {
		void this.app.workspace.revealLeaf(item);
		this.close();
	}
}