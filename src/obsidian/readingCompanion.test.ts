/** @file Tests for the reading companion. */
import { WorkspaceLeaf } from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import ReadingCompanion from './ReadingCompanion';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith
} from '../test/clusterHelpers';
import { buildCluster } from '../test/fakes';
import type {
	PromptForClusterChoice,
	TabCandyCluster
} from '../types';

describe('ReadingCompanion', () => {
	/**
	 * Builds a companion over a workspace with the tabs `companion.md`, `a.md` and `b.md`, registers it, and makes `companion.md` follow a Cluster holding `a.md`.
	 *
	 * @param clusters - The Clusters. Defaults to one, `cluster-a`, holding `a.md`.
	 * @returns The app, store, companion and its tabs.
	 */
	async function setUp(clusters: TabCandyCluster[] = [buildCluster({
		id: 'cluster-a',
		members: ['a.md']
	})]) {
		const app = createFakeWorkspaceApp();
		const store = buildStoreWith(...clusters);
		const readingCompanion = new ReadingCompanion(
			app,
			store
		);
		const cleanups: (() => void)[] = [];
		readingCompanion.register(
			() => {},
			(cleanup) => cleanups.push(cleanup)
		);
		const pane = {};
		const companionLeaf = await addFileTab(
			app,
			'companion.md',
			pane
		);
		const memberLeaf = await addFileTab(
			app,
			'a.md',
			pane
		);
		const otherLeaf = await addFileTab(
			app,
			'b.md',
			pane
		);
		await readingCompanion.set(
			companionLeaf,
			'cluster-a'
		);

		return {
			app,
			store,
			readingCompanion,
			cleanups,
			companionLeaf,
			memberLeaf,
			otherLeaf
		};
	}

	/**
	 * Reads the link group of a leaf.
	 *
	 * @param leaf - The leaf.
	 * @returns The group, or null.
	 */
	function groupOf(leaf: WorkspaceLeaf): string | null {
		return (leaf as unknown as { getGroup__: () => string | null }).getGroup__();
	}

	describe('set', () => {
		it('switches the tab to reading view and keeps its file', async () => {
			const { companionLeaf } = await setUp();

			const viewState = companionLeaf.getViewState();

			expect(viewState.state).toMatchObject({
				file: 'companion.md',
				mode: 'preview'
			});
		});

		it('replaces the earlier companion', async () => {
			const {
				app,
				readingCompanion,
				companionLeaf,
				memberLeaf,
				otherLeaf
			} = await setUp();
			await readingCompanion.set(
				otherLeaf,
				'cluster-a'
			);

			app.workspace.trigger(
				'active-leaf-change',
				memberLeaf
			);

			expect([
				groupOf(otherLeaf) === groupOf(memberLeaf),
				groupOf(companionLeaf) === groupOf(memberLeaf)
			]).toEqual([
				true,
				false
			]);
		});
	});

	describe('following', () => {
		it('links the companion to a member of its Cluster that becomes active', async () => {
			const {
				app,
				companionLeaf,
				memberLeaf
			} = await setUp();

			app.workspace.trigger(
				'active-leaf-change',
				memberLeaf
			);

			expect(groupOf(companionLeaf)).not.toBeNull();
			expect(groupOf(companionLeaf)).toBe(groupOf(memberLeaf));
		});

		it('ignores a tab that is not a member', async () => {
			const {
				app,
				companionLeaf,
				otherLeaf
			} = await setUp();

			app.workspace.trigger(
				'active-leaf-change',
				otherLeaf
			);

			expect(groupOf(companionLeaf)).toBeNull();
		});

		it('ignores a tab with no file', async () => {
			const {
				app,
				companionLeaf
			} = await setUp();
			const tab = await addNonFileTab(
				app,
				{}
			);

			app.workspace.trigger(
				'active-leaf-change',
				tab
			);

			expect(groupOf(companionLeaf)).toBeNull();
		});

		it('ignores the companion itself', async () => {
			const {
				app,
				store,
				readingCompanion,
				memberLeaf,
				companionLeaf
			} = await setUp();
			await store.update({clusters: {'cluster-a': buildCluster({
				id: 'cluster-a',
				members: [
					'a.md',
					'companion.md'
				]
			})}});
			await readingCompanion.set(
				companionLeaf,
				'cluster-a'
			);

			app.workspace.trigger(
				'active-leaf-change',
				companionLeaf
			);

			expect(groupOf(memberLeaf)).toBeNull();
			expect(groupOf(companionLeaf)).toBeNull();
		});

		it('ignores a tab outside the root', async () => {
			const {
				app,
				companionLeaf,
				memberLeaf
			} = await setUp();
			memberLeaf.detach();

			app.workspace.trigger(
				'active-leaf-change',
				memberLeaf
			);

			expect(groupOf(companionLeaf)).toBeNull();
		});
	});

	describe('clearing', () => {
		it('clears when the companion\'s tab closes', async () => {
			const {
				app,
				readingCompanion,
				companionLeaf
			} = await setUp();
			companionLeaf.detach();

			app.workspace.trigger('layout-change');

			expect(readingCompanion.isSet()).toBe(false);
		});

		it('stays set when another tab closes', async () => {
			const {
				app,
				readingCompanion,
				otherLeaf
			} = await setUp();
			otherLeaf.detach();

			app.workspace.trigger('layout-change');

			expect(readingCompanion.isSet()).toBe(true);
		});

		it('clears when its Cluster is deleted', async () => {
			const {
				store,
				readingCompanion
			} = await setUp();

			await store.update({ clusters: {} });

			expect(readingCompanion.isSet()).toBe(false);
		});

		it('stays set when another Cluster is deleted', async () => {
			const {
				store,
				readingCompanion
			} = await setUp([
				buildCluster({
					id: 'cluster-a',
					members: ['a.md']
				}),
				buildCluster({ id: 'cluster-b' })
			]);

			await store.update({clusters: {'cluster-a': buildCluster({
				id: 'cluster-a',
				members: ['a.md']
			})}});

			expect(readingCompanion.isSet()).toBe(true);
		});

		it('clears and stops following when the plugin unloads', async () => {
			const {
				app,
				readingCompanion,
				cleanups,
				companionLeaf,
				memberLeaf
			} = await setUp();

			cleanups.forEach((cleanup) => cleanup());
			app.workspace.trigger(
				'active-leaf-change',
				memberLeaf
			);

			expect(readingCompanion.isSet()).toBe(false);
			expect(groupOf(companionLeaf)).toBeNull();
		});
	});

	describe('promptAndSet', () => {
		it('offers the Cluster that holds the tab\'s file first when exactly one does', async () => {
			const {
				readingCompanion,
				memberLeaf
			} = await setUp([
				buildCluster({
					id: 'cluster-a',
					name: 'A'
				}),
				buildCluster({
					id: 'cluster-b',
					name: 'B',
					members: ['a.md']
				})
			]);
			const prompt = vi.fn<PromptForClusterChoice>();

			readingCompanion.promptAndSet(
				prompt,
				memberLeaf
			);

			expect(prompt.mock.calls[0][0].map((cluster) => cluster.id)).toEqual([
				'cluster-b',
				'cluster-a'
			]);
		});

		it('keeps the Clusters in their order when several hold the file', async () => {
			const {
				readingCompanion,
				memberLeaf
			} = await setUp([
				buildCluster({
					id: 'cluster-a',
					members: ['a.md']
				}),
				buildCluster({
					id: 'cluster-b',
					members: ['a.md']
				})
			]);
			const prompt = vi.fn<PromptForClusterChoice>();

			readingCompanion.promptAndSet(
				prompt,
				memberLeaf
			);

			expect(prompt.mock.calls[0][0].map((cluster) => cluster.id)).toEqual([
				'cluster-a',
				'cluster-b'
			]);
		});
	});
});