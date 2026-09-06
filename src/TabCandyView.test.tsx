import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { act } from 'react';
import { App, WorkspaceLeaf } from 'obsidian';
import { buildSettings, createConfiguredApp } from './test/fakes';
import SettingsStore from './settings/SettingsStore';

// Tells React it's safe to batch/flush effects synchronously inside act()
// in this non-testing-library environment - without this, act() still
// works but warns on every call that the environment "is not configured
// to support act(...)".
(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// TabCandyView's job for this file is its own mount/unmount lifecycle, not
// what App.tsx renders - App.tsx has its own data-fetching, network, and
// private-registry concerns that belong to its own tests (Testing
// Specification, "Trust boundaries": we test our code, not React itself).
// Substituting a minimal marker component keeps this file scoped to the
// view's own contract: does onOpen() mount something into contentEl, does
// onClose() actually unmount it, and does that hold up across repeated
// open/close and multiple leaves.
vi.mock('./app/App', () => ({
	default: () => <div data-testid = 'tabcandy-app-marker' />,
}));

// Imported after the mock so the mocked module is what TabCandyView's own
// import resolves to.
const { TabCandyView } = await import('./TabCandyView');

function buildLeaf(app: App): WorkspaceLeaf {
	return app.workspace.getLeaf(true);
}

function buildView(app: App) {
	const settingsStore = new SettingsStore(buildSettings(), async () => {});
	const leaf = buildLeaf(app);

	return new TabCandyView(settingsStore, leaf);
}

// createRoot()'s render is scheduled, not synchronous, under React 18's
// concurrent root - act() is what flushes it within a test so assertions
// against contentEl see the result immediately rather than racing it.
async function open(view: InstanceType<typeof TabCandyView>): Promise<void> {
	await act(async () => {
		await view.onOpen();
	});
}

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
