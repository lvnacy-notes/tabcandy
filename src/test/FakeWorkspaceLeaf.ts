import { App, ViewState, WorkspaceLeaf } from 'obsidian';
import {
	App as AppMock,
	WorkspaceLeaf as WorkspaceLeafMock,
} from 'obsidian-test-mocks/obsidian';

/**
 * A leaf whose getViewState() can be made to throw, and which reports
 * itself as empty - `{ type: 'empty', state: {} }` from getViewState(),
 * `"New tab"` from getDisplayText() - until it's given real content, and
 * again after detach() is called.
 */
export default class FakeWorkspaceLeaf extends WorkspaceLeafMock {
	private unreadable = false;
	private hasContent = false;
	private displayText: string | null = null;

	constructor(app: AppMock, id?: string) {
		super(app, id);
	}

	makeUnreadable(): void {
		this.unreadable = true;
	}

	/**
	 * Sets what getDisplayText() returns while this leaf has content.
	 * There's no view object behind a fake leaf for getDisplayText() to
	 * read a real title from, so a test provides one directly.
	 */
	setDisplayText(text: string): void {
		this.displayText = text;
	}

	override async setViewState(
		viewState: ViewState,
		eState?: Record<string, unknown>
	): Promise<void> {
		await super.setViewState(viewState, eState);
		this.hasContent = true;
	}

	override detach(): void {
		super.detach();
		this.hasContent = false;
		this.displayText = null;
	}

	override getViewState(): ViewState {
		if (this.unreadable) {
			throw new Error(
				'FakeWorkspaceLeaf: getViewState() is forced to throw for this leaf'
			);
		}
		if (!this.hasContent) {
			return { type: 'empty', state: {} };
		}
		return super.getViewState();
	}

	override getDisplayText(): string {
		if (!this.hasContent) {
			return 'New tab';
		}
		return this.displayText ?? '';
	}
}

/**
 * Builds a fake leaf.
 */
export function createFakeLeaf(app: App, id?: string): WorkspaceLeaf {
	const leaf = new FakeWorkspaceLeaf(app as unknown as AppMock, id);
	return leaf.asOriginalType3__();
}

/**
 * Makes a leaf built by createFakeLeaf() throw from getViewState() from
 * this point on.
 */
export function makeUnreadable(leaf: WorkspaceLeaf): void {
	(leaf as unknown as FakeWorkspaceLeaf).makeUnreadable();
}

/**
 * Sets what a leaf built by createFakeLeaf() returns from getDisplayText()
 * while it has content.
 */
export function setDisplayText(leaf: WorkspaceLeaf, text: string): void {
	(leaf as unknown as FakeWorkspaceLeaf).setDisplayText(text);
}