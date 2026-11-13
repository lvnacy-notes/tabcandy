/** @file Tests for the Tab Candy view. */
import { App, WorkspaceLeaf } from 'obsidian';
import { act } from 'react';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import SettingsStore from '../settings/SettingsStore';
import { buildSettings, createConfiguredApp } from '../test/fakes';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../app/App', () => ({
	default: () => <div data-testid = 'tabcandy-app-marker' />,
}));

const { TabCandyView } = await import('./TabCandyView');

/**
 * Builds a leaf.
 *
 * @param app - The app.
 * @returns The leaf.
 */
function buildLeaf(app: App): WorkspaceLeaf {
	return app.workspace.getLeaf(true);
}

/**
 * Builds a view over a fresh leaf.
 *
 * @param app - The app.
 * @returns The view.
 */
function buildView(app: App) {
	const settingsStore = new SettingsStore(buildSettings(), async () => {});
	const leaf = buildLeaf(app);

	return new TabCandyView(settingsStore, leaf);
}

/**
 * Opens a view inside `act()`.
 *
 * @param view - The view.
 */
async function open(view: InstanceType<typeof TabCandyView>): Promise<void> {
	await act(async () => {
		await view.onOpen();
	});
}

/**
 * Closes a view inside `act()`.
 *
 * @param view - The view.
 */
async function close(view: InstanceType<typeof TabCandyView>): Promise<void> {
	await act(async () => {
		await view.onClose();
	});
}

describe('TabCandyView', () => {
	describe('onOpen', () => {
		it('clears any existing content before mounting', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);
			view.contentEl.appendChild(createSpan());

			await open(view);

			expect(view.contentEl.children.length).toBe(1);
			expect(view.contentEl.querySelector('span')).toBeNull();
		});

		it('mounts content into contentEl', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);

			await open(view);

			expect(view.contentEl.querySelector('[data-testid="tabcandy-app-marker"]')).not.toBeNull();
		});

		it('adds the tabcandy class to the container element', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);

			await open(view);

			expect(view.containerEl.hasClass('tabcandy')).toBe(true);
		});
	});

	describe('onClose', () => {
		it('unmounts the React root, leaving contentEl empty', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);
			await open(view);

			await close(view);

			expect(view.contentEl.children.length).toBe(0);
		});

		it('nulls the root reference so a stray reference cannot be reused', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);
			await open(view);

			await close(view);

			expect(view.root).toBeNull();
		});

		it('does not throw when called without a prior onOpen', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);

			await expect(view.onClose()).resolves.not.toThrow();
		});
	});

	describe('open -> close -> reopen', () => {
		it('does not leak a second root: content after reopen matches a single mount, not a doubled one', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);

			await open(view);
			await close(view);
			await open(view);

			expect(view.contentEl.querySelectorAll('[data-testid="tabcandy-app-marker"]').length).toBe(1);
		});

		it('survives repeated open/close cycles without throwing', async () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);

			for (let i = 0; i < 5; i++) {
				await open(view);
				await close(view);
			}

			expect(view.contentEl.children.length).toBe(0);
			expect(view.root).toBeNull();
		});
	});

	describe('multiple leaves', () => {
		it('mounts independently per leaf: closing one view does not clear another', async () => {
			const app = createConfiguredApp({ files: {} });
			const viewOne = buildView(app);
			const viewTwo = buildView(app);

			await open(viewOne);
			await open(viewTwo);
			await close(viewOne);

			expect(viewOne.contentEl.children.length).toBe(0);
			expect(viewTwo.contentEl.querySelector('[data-testid="tabcandy-app-marker"]')).not.toBeNull();
		});

		it('each view instance owns its own React root', async () => {
			const app = createConfiguredApp({ files: {} });
			const viewOne = buildView(app);
			const viewTwo = buildView(app);

			await open(viewOne);
			await open(viewTwo);

			expect(viewOne.root).not.toBeNull();
			expect(viewTwo.root).not.toBeNull();
			expect(viewOne.root).not.toBe(viewTwo.root);
		});
	});

	describe('view type identity', () => {
		it('reports the stable registered view type', () => {
			const app = createConfiguredApp({ files: {} });
			const view = buildView(app);

			expect(view.getViewType()).toBe('tabcandy-react-view');
		});
	});
});