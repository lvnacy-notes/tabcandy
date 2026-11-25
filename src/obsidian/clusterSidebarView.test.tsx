/** @file Tests for the Cluster sidebar view. */
import {
	App,
	WorkspaceLeaf
} from 'obsidian';
import { act } from 'react';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildDependencies } from '../test/dependencyHelpers';
import { createConfiguredApp } from '../test/fakes';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Replaces the sidebar component with a marker. */
vi.mock(
	'../app/ClusterSidebar',
	() => ({ default: () => <div data-testid = 'sidebar-marker' /> })
);

const { ClusterSidebarView } = await import('./ClusterSidebarView');

/**
 * Builds a view over a fresh leaf.
 *
 * @param app - The app.
 * @returns The view.
 */
function buildView(app: App) {
	const leaf: WorkspaceLeaf = app.workspace.getLeaf(true);
	return new ClusterSidebarView(
		buildDependencies(
			app,
			buildStoreWith()
		),
		leaf
	);
}

/**
 * Opens a view.
 *
 * @param view - The view.
 */
async function open(view: ReturnType<typeof buildView>): Promise<void> {
	await act(async () => {
		await view.onOpen();
	});
}

/**
 * Closes a view.
 *
 * @param view - The view.
 */
async function close(view: ReturnType<typeof buildView>): Promise<void> {
	await act(async () => {
		await view.onClose();
	});
}

describe('ClusterSidebarView', () => {
	it('renders the sidebar when opened', async () => {
		const view = buildView(createConfiguredApp());

		await open(view);

		expect(view.contentEl.querySelector('[data-testid="sidebar-marker"]')).not.toBeNull();
	});

	describe('onClose', () => {
		it('unmounts the React root, leaving contentEl empty', async () => {
			const view = buildView(createConfiguredApp());
			await open(view);

			await close(view);

			expect(view.contentEl.children.length).toBe(0);
		});

		it('nulls the root reference', async () => {
			const view = buildView(createConfiguredApp());
			await open(view);

			await close(view);

			expect(view.root).toBeNull();
		});

		it('does not throw when called without a prior onOpen', async () => {
			const view = buildView(createConfiguredApp());

			await expect(view.onClose()).resolves.not.toThrow();
		});
	});

	describe('open -> close -> reopen', () => {
		it('does not leak a second root: content after reopen matches a single mount', async () => {
			const view = buildView(createConfiguredApp());

			await open(view);
			await close(view);
			await open(view);

			expect(view.contentEl.querySelectorAll('[data-testid="sidebar-marker"]')).toHaveLength(1);
		});

		it('survives repeated open and close cycles', async () => {
			const view = buildView(createConfiguredApp());

			for (let cycle = 0; cycle < 5; cycle++) {
				await open(view);
				await close(view);
			}

			expect([
				view.contentEl.children.length,
				view.root
			]).toEqual([
				0,
				null
			]);
		});
	});

	describe('multiple leaves', () => {
		it('mounts independently per leaf: closing one view does not clear another', async () => {
			const app = createConfiguredApp();
			const viewOne = buildView(app);
			const viewTwo = buildView(app);
			await open(viewOne);
			await open(viewTwo);

			await close(viewOne);

			expect([
				viewOne.contentEl.children.length,
				viewTwo.contentEl.querySelector('[data-testid="sidebar-marker"]') === null
			]).toEqual([
				0,
				false
			]);
		});
	});
});