/** @file A fake workspace leaf for tests. */
import {
	App,
	ViewState,
	WorkspaceLeaf
} from 'obsidian';
import {
	App as AppMock,
	WorkspaceLeaf as WorkspaceLeafMock,
} from 'obsidian-test-mocks/obsidian';

/** A leaf that reports the `active`, `group` and `pinned` fields it was last given, can be made to throw from `getViewState()`, and reports `{ type: 'empty', state: {} }` and "New tab" until given content and again after `detach()`. */
export default class FakeWorkspaceLeaf extends WorkspaceLeafMock {
	private extraState: Partial<ViewState> = {};
	private unreadable = false;
	private hasContent = false;
	private displayText: string | null = null;

	/**
	 * @param app - The mock app.
	 * @param id - The leaf's id.
	 */
	constructor(app: AppMock, id?: string) {
		super(app, id);
	}

	/** Makes `getViewState()` throw from now on. */
	makeUnreadable(): void {
		this.unreadable = true;
	}

	/**
	 * Sets what `getDisplayText()` returns while the leaf has content.
	 *
	 * @param text - The display text.
	 */
	setDisplayText(text: string): void {
		this.displayText = text;
	}

	/**
	 * Sets the view state and records its `active`, `group` and `pinned` fields.
	 *
	 * @param viewState - The view state.
	 * @param eState - The ephemeral state.
	 */
	override async setViewState(
		viewState: ViewState,
		eState?: Record<string, unknown>
	): Promise<void> {
		await super.setViewState(viewState, eState);
		this.hasContent = true;
		this.extraState = {};
		if (viewState.active !== undefined) {
			this.extraState.active = viewState.active;
		}
		if (viewState.group !== undefined) {
			this.extraState.group = viewState.group;
		}
		if (viewState.pinned !== undefined) {
			this.extraState.pinned = viewState.pinned;
		}
	}

	/** Detaches the leaf and resets it to empty. */
	override detach(): void {
		super.detach();
		this.extraState = {};
		this.hasContent = false;
		this.displayText = null;
	}

	/**
	 * Reports the view state, or an empty one when the leaf has no content.
	 *
	 * @returns The view state.
	 */
	override getViewState(): ViewState {
		if (this.unreadable) {
			throw new Error(
				'FakeWorkspaceLeaf: getViewState() is forced to throw for this leaf'
			);
		}
		if (!this.hasContent) {
			return { type: 'empty', state: {} };
		}
		return { ...super.getViewState(), ...this.extraState };
	}

	/**
	 * Reports the display text, or "New tab" when the leaf has no content.
	 *
	 * @returns The display text.
	 */
	override getDisplayText(): string {
		if (!this.hasContent) {
			return 'New tab';
		}
		return this.displayText ?? '';
	}
}

/**
 * Builds a `FakeWorkspaceLeaf`.
 *
 * @param app - The app.
 * @param id - The leaf's id.
 * @returns The leaf.
 */
export function createFakeLeaf(app: App, id?: string): WorkspaceLeaf {
	const leaf = new FakeWorkspaceLeaf(app as unknown as AppMock, id);
	return leaf.asOriginalType3__();
}

/**
 * Makes a leaf from `createFakeLeaf()` throw from `getViewState()`.
 *
 * @param leaf - The leaf.
 */
export function makeUnreadable(leaf: WorkspaceLeaf): void {
	(leaf as unknown as FakeWorkspaceLeaf).makeUnreadable();
}

/**
 * Sets what a leaf from `createFakeLeaf()` returns from `getDisplayText()` while it has content.
 *
 * @param leaf - The leaf.
 * @param text - The display text.
 */
export function setDisplayText(leaf: WorkspaceLeaf, text: string): void {
	(leaf as unknown as FakeWorkspaceLeaf).setDisplayText(text);
}