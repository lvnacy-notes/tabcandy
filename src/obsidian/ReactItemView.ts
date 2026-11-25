/** @file Base class for the plugin's views that render a React app into their content element. */
import { ItemView } from 'obsidian';
import type { ReactElement } from 'react';
import {
	Root,
	createRoot
} from 'react-dom/client';

/** An Obsidian view that mounts a React app on open and unmounts it on close. */
export abstract class ReactItemView extends ItemView {
	root: Root | null = null;

	/** Class added to the view's container element. */
	protected abstract readonly hostClass: string;

	/** Unmounts the React root. */
	onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;

		return Promise.resolve();
	}

	/** Replaces any existing content with a fresh React root. */
	onOpen(): Promise<void> {
		this.contentEl.empty();

		this.root = createRoot(this.contentEl);
		this.root.render(this.renderApp());
		this.containerEl.addClass(this.hostClass);

		return Promise.resolve();
	}

	/**
	 * Builds the React app the view hosts.
	 *
	 * @returns The element to render.
	 */
	protected abstract renderApp(): ReactElement;
}
