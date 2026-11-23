/** @file Tests for opening and closing a Cluster. */
import { App } from 'obsidian';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	closeCluster,
	getOpenMembers,
	openCluster
} from './clusterOpenClose';
import SettingsStore from '../settings/SettingsStore';
import {
	addFileTab,
	buildStoreWith
} from '../test/clusterHelpers';
import {
	buildCluster,
	buildClusters,
	buildStore
} from '../test/fakes';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import FakeWorkspaceLeaf from '../test/FakeWorkspaceLeaf';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

/**
 * Makes `openFile` show the file in the leaf, as Obsidian does.
 *
 * @returns The spy.
 */
function showFilesOnOpen(): ReturnType<typeof vi.spyOn> {
	return vi.spyOn(
		FakeWorkspaceLeaf.prototype,
		'openFile'
	).mockImplementation(async function (
		this: FakeWorkspaceLeaf,
		file: { path: string }
	) {
		await this.setViewState({
			type: 'markdown',
			state: { file: file.path }
		});
	});
}

/**
 * Builds the layout `getLayout()` returns: a `main` tree holding the given tab groups side by side.
 *
 * @param groups - The files of each tab group.
 * @returns The layout.
 */
function buildLayout(...groups: string[][]): Record<string, unknown> {
	const tabs = groups.map((files) => ({
		id: `tabs-${ files.join('-') }`,
		type: 'tabs',
		children: files.map((file) => ({
			id: `leaf-${ file }`,
			type: 'leaf',
			state: {
				type: 'markdown',
				state: { file }
			},
		})),
	}));
	return {
		main: tabs.length === 1
			? tabs[0]
			: {
				id: 'root',
				type: 'split',
				direction: 'vertical',
				children: tabs
			},
		left: {
			type: 'split',
			children: []
		},
	};
}

/**
 * Makes `getLayout()` return a layout.
 *
 * @param app - The app.
 * @param layout - The layout.
 */
function setLayout(app: App, layout: Record<string, unknown>): void {
	app.workspace.getLayout = () => layout;
}

/**
 * Lists the paths shown by the root leaves of a Cluster.
 *
 * @param app - The app.
 * @param store - The store.
 * @param id - Id of the Cluster.
 * @returns The open member paths.
 */
function openPaths(app: App, store: SettingsStore, id: string): string[] {
	return Array.from(getOpenMembers(
		app,
		store.get().clusters[id]
	).keys()).sort();
}

describe('closeCluster', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('closes every open member and leaves other tabs open', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		await addFileTab(
			app,
			'b.md',
			{}
		);
		const other = await addFileTab(
			app,
			'other.md',
			{}
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		await closeCluster(
			app,
			store,
			'one'
		);

		expect([
			openPaths(
				app,
				store,
				'one'
			),
			other.getViewState().type
		]).toEqual([
			[],
			'markdown'
		]);
	});

	it('never closes a pinned member', async () => {
		const app = createFakeWorkspaceApp();
		const pinned = await addFileTab(
			app,
			'a.md',
			{}
		);
		await pinned.setViewState({
			type: 'markdown',
			state: { file: 'a.md' },
			pinned: true,
		});
		await addFileTab(
			app,
			'b.md',
			{}
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		await closeCluster(
			app,
			store,
			'one'
		);

		expect(openPaths(
			app,
			store,
			'one'
		)).toEqual(['a.md']);
	});

	it('never closes a Tray', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		const tray = await addFileTab(
			app,
			'tray-stand-in.md',
			{}
		);
		await tray.setViewState({
			type: CLUSTER_TRAY_VIEW_TYPE,
			state: { clusterId: 'one' },
		});
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md']
		}));

		await closeCluster(
			app,
			store,
			'one'
		);

		expect(tray.getViewState().type).toBe(CLUSTER_TRAY_VIEW_TYPE);
	});

	it('captures the layout of the open members before closing', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		await addFileTab(
			app,
			'b.md',
			{}
		);
		setLayout(
			app,
			buildLayout(
				[
					'a.md',
					'other.md'
				],
				['b.md']
			)
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		await closeCluster(
			app,
			store,
			'one'
		);

		expect(store.get().clusters['one'].layoutSnapshot).toEqual({
			type: 'split',
			direction: 'vertical',
			children: [
				{
					type: 'tabs',
					children: [{
						type: 'leaf',
						state: {
							type: 'markdown',
							state: { file: 'a.md' }
						}
					}]
				},
				{
					type: 'tabs',
					children: [{
						type: 'leaf',
						state: {
							type: 'markdown',
							state: { file: 'b.md' }
						}
					}]
				}
			]
		});
	});

	it('keeps the existing snapshot when no member is open', async () => {
		const app = createFakeWorkspaceApp();
		const snapshot = {
			type: 'tabs',
			children: []
		};
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md'],
			layoutSnapshot: snapshot,
		}));

		await closeCluster(
			app,
			store,
			'one'
		);

		expect(store.get().clusters['one'].layoutSnapshot).toBe(snapshot);
	});

	it('does not change lastTouchedAt', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		setLayout(
			app,
			buildLayout(['a.md'])
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md'],
			lastTouchedAt: 7,
		}));

		await closeCluster(
			app,
			store,
			'one'
		);

		expect(store.get().clusters['one'].lastTouchedAt).toBe(7);
	});

	it('does nothing for a Cluster that does not exist', async () => {
		const app = createFakeWorkspaceApp();
		const store = buildStoreWith();

		await closeCluster(
			app,
			store,
			'gone'
		);

		expect(store.get().clusters).toEqual({});
	});

	describe('with keepPairedClustersInSync on', () => {
		/**
		 * Builds a store of two paired Clusters and a third with the same file.
		 *
		 * @param sync - Whether sync is on.
		 * @returns The store.
		 */
		function buildPairedStore(sync: boolean): SettingsStore {
			return buildStore({
				keepPairedClustersInSync: sync,
				clusters: buildClusters(
					buildCluster({
						id: 'one',
						members: ['a.md'],
						pairedWith: 'two',
					}),
					buildCluster({
						id: 'two',
						members: ['x.md'],
						pairedWith: 'one',
					}),
					buildCluster({
						id: 'three',
						members: ['q.md']
					})
				),
			});
		}

		it('closes the paired Cluster too and captures its layout', async () => {
			const app = createFakeWorkspaceApp();
			await addFileTab(
				app,
				'a.md',
				{}
			);
			await addFileTab(
				app,
				'x.md',
				{}
			);
			setLayout(
				app,
				buildLayout([
					'a.md',
					'x.md'
				])
			);
			const store = buildPairedStore(true);

			await closeCluster(
				app,
				store,
				'one'
			);

			expect([
				openPaths(
					app,
					store,
					'two'
				),
				store.get().clusters['two'].layoutSnapshot !== undefined
			]).toEqual([
				[],
				true
			]);
		});

		it('goes one hop and no further', async () => {
			const app = createFakeWorkspaceApp();
			await addFileTab(
				app,
				'a.md',
				{}
			);
			await addFileTab(
				app,
				'q.md',
				{}
			);
			const store = buildPairedStore(true);

			await closeCluster(
				app,
				store,
				'one'
			);

			expect(openPaths(
				app,
				store,
				'three'
			)).toEqual(['q.md']);
		});

		it('leaves the paired Cluster open when sync is off', async () => {
			const app = createFakeWorkspaceApp();
			await addFileTab(
				app,
				'a.md',
				{}
			);
			await addFileTab(
				app,
				'x.md',
				{}
			);
			const store = buildPairedStore(false);

			await closeCluster(
				app,
				store,
				'one'
			);

			expect(openPaths(
				app,
				store,
				'two'
			)).toEqual(['x.md']);
		});
	});
});

describe('getOpenMembers', () => {
	it('lists the leaves showing each member and ignores other tabs', async () => {
		const app = createFakeWorkspaceApp();
		const a = await addFileTab(
			app,
			'a.md',
			{}
		);
		await addFileTab(
			app,
			'other.md',
			{}
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		const open = getOpenMembers(
			app,
			store.get().clusters['one']
		);

		expect(Array.from(open.entries())).toEqual([[
			'a.md',
			[a]
		]]);
	});

	it('lists every leaf when a member is open twice', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		await addFileTab(
			app,
			'a.md',
			{}
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md']
		}));

		const open = getOpenMembers(
			app,
			store.get().clusters['one']
		);

		expect(open.get('a.md')).toHaveLength(2);
	});
});

describe('openCluster', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		showFilesOnOpen();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('opens every present member as a tab', async () => {
		const app = createFakeWorkspaceApp({ files: {
			'a.md': '',
			'b.md': ''
		} });
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		await openCluster(
			app,
			store,
			'one'
		);

		expect(openPaths(
			app,
			store,
			'one'
		)).toEqual([
			'a.md',
			'b.md'
		]);
	});

	it('skips a missing member', async () => {
		const app = createFakeWorkspaceApp({ files: { 'a.md': '' } });
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'gone.md'
			]
		}));

		await openCluster(
			app,
			store,
			'one'
		);

		expect(openPaths(
			app,
			store,
			'one'
		)).toEqual(['a.md']);
	});

	it('does not reopen a member that is already open when jumpToExistingCluster is on', async () => {
		const app = createFakeWorkspaceApp({ files: {
			'a.md': '',
			'b.md': ''
		} });
		await addFileTab(
			app,
			'a.md',
			{}
		);
		vi.spyOn(
			app.workspace,
			'setActiveLeaf'
		).mockImplementation(() => {});
		const store = buildStore({
			jumpToExistingCluster: true,
			clusters: buildClusters(buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				]
			})),
		});

		await openCluster(
			app,
			store,
			'one'
		);

		expect(getOpenMembers(
			app,
			store.get().clusters['one']
		).get('a.md')).toHaveLength(1);
	});

	it('opens a member that is already open again when jumpToExistingCluster is off', async () => {
		const app = createFakeWorkspaceApp({ files: {
			'a.md': '',
			'b.md': ''
		} });
		await addFileTab(
			app,
			'a.md',
			{}
		);
		vi.spyOn(
			app.workspace,
			'setActiveLeaf'
		).mockImplementation(() => {});
		const store = buildStore({
			jumpToExistingCluster: false,
			clusters: buildClusters(buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				]
			})),
		});

		await openCluster(
			app,
			store,
			'one'
		);

		expect(getOpenMembers(
			app,
			store.get().clusters['one']
		).get('a.md')).toHaveLength(2);
	});

	it('makes the first open member in members order the active tab', async () => {
		const app = createFakeWorkspaceApp({ files: {
			'a.md': '',
			'b.md': ''
		} });
		const setActiveLeaf = vi.spyOn(
			app.workspace,
			'setActiveLeaf'
		);
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: [
				'a.md',
				'b.md'
			]
		}));

		await openCluster(
			app,
			store,
			'one'
		);

		const first = getOpenMembers(
			app,
			store.get().clusters['one']
		).get('a.md')?.[0];
		expect(setActiveLeaf).toHaveBeenLastCalledWith(
			first,
			{ focus: true }
		);
	});

	it('bumps lastTouchedAt', async () => {
		vi.setSystemTime(5000);
		const app = createFakeWorkspaceApp({ files: { 'a.md': '' } });
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md']
		}));

		await openCluster(
			app,
			store,
			'one'
		);

		expect(store.get().clusters['one'].lastTouchedAt).toBe(5000);
	});

	it('does nothing for a Cluster that does not exist', async () => {
		const app = createFakeWorkspaceApp();
		const store = buildStoreWith();

		await openCluster(
			app,
			store,
			'gone'
		);

		expect(store.get().clusters).toEqual({});
	});

	describe('with a layout snapshot', () => {
		it('splits off a new pane for a second group, in the split\'s direction', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'b.md': ''
			} });
			const createLeafBySplit = vi.fn((
				_leaf: unknown,
				_direction?: string
			) => app.workspace.getLeaf('tab'));
			app.workspace.createLeafBySplit = createLeafBySplit;
			const store = buildStoreWith(buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				],
				layoutSnapshot: buildLayout(
					['a.md'],
					['b.md']
				)['main'] as Record<string, unknown>,
			}));

			await openCluster(
				app,
				store,
				'one'
			);

			expect([
				createLeafBySplit.mock.calls.map((call) => call[1]),
				openPaths(
					app,
					store,
					'one'
				)
			]).toEqual([
				['vertical'],
				[
					'a.md',
					'b.md'
				]
			]);
		});

		it('does not split when the snapshot holds one group', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'b.md': ''
			} });
			const createLeafBySplit = vi.fn((
				_leaf: unknown,
				_direction?: string
			) => app.workspace.getLeaf('tab'));
			app.workspace.createLeafBySplit = createLeafBySplit;
			const store = buildStoreWith(buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				],
				layoutSnapshot: buildLayout([
					'a.md',
					'b.md'
				])['main'] as Record<string, unknown>,
			}));

			await openCluster(
				app,
				store,
				'one'
			);

			expect([
				createLeafBySplit.mock.calls.length,
				openPaths(
					app,
					store,
					'one'
				)
			]).toEqual([
				0,
				[
					'a.md',
					'b.md'
				]
			]);
		});

		it('opens a member the snapshot does not hold', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'b.md': ''
			} });
			const store = buildStoreWith(buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				],
				layoutSnapshot: buildLayout(['a.md'])['main'] as Record<string, unknown>,
			}));

			await openCluster(
				app,
				store,
				'one'
			);

			expect(openPaths(
				app,
				store,
				'one'
			)).toEqual([
				'a.md',
				'b.md'
			]);
		});

		it('skips a snapshot path that is no longer a member', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'old.md': ''
			} });
			const store = buildStoreWith(buildCluster({
				id: 'one',
				members: ['a.md'],
				layoutSnapshot: buildLayout([
					'a.md',
					'old.md'
				])['main'] as Record<string, unknown>,
			}));

			await openCluster(
				app,
				store,
				'one'
			);

			expect(openPaths(
				app,
				store,
				'one'
			)).toEqual(['a.md']);
		});

		it('opens every member as a plain tab when splitting fails', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'b.md': ''
			} });
			app.workspace.createLeafBySplit = () => {
				throw new Error('no split');
			};
			const store = buildStoreWith(buildCluster({
				id: 'one',
				members: [
					'a.md',
					'b.md'
				],
				layoutSnapshot: buildLayout(
					['a.md'],
					['b.md']
				)['main'] as Record<string, unknown>,
			}));

			await openCluster(
				app,
				store,
				'one'
			);

			expect(Array.from(getOpenMembers(
				app,
				store.get().clusters['one']
			).values()).map((leaves) => leaves.length)).toEqual([
				1,
				1
			]);
		});
	});

	describe('with keepPairedClustersInSync on', () => {
		/**
		 * Builds a store of two paired Clusters and a third.
		 *
		 * @param sync - Whether sync is on.
		 * @returns The store.
		 */
		function buildPairedStore(sync: boolean): SettingsStore {
			return buildStore({
				keepPairedClustersInSync: sync,
				clusters: buildClusters(
					buildCluster({
						id: 'one',
						members: ['a.md'],
						pairedWith: 'two',
					}),
					buildCluster({
						id: 'two',
						members: ['x.md'],
						pairedWith: 'one',
					}),
					buildCluster({
						id: 'three',
						members: ['q.md']
					})
				),
			});
		}

		it('opens the paired Cluster too', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'x.md': '',
				'q.md': ''
			} });
			setMostRecentLeaf(
				app,
				null
			);
			const store = buildPairedStore(true);

			await openCluster(
				app,
				store,
				'one'
			);

			expect([
				openPaths(
					app,
					store,
					'one'
				),
				openPaths(
					app,
					store,
					'two'
				)
			]).toEqual([
				['a.md'],
				['x.md']
			]);
		});

		it('goes one hop and no further', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'x.md': '',
				'q.md': ''
			} });
			const store = buildPairedStore(true);

			await openCluster(
				app,
				store,
				'one'
			);

			expect(openPaths(
				app,
				store,
				'three'
			)).toEqual([]);
		});

		it('leaves the paired Cluster closed when sync is off', async () => {
			const app = createFakeWorkspaceApp({ files: {
				'a.md': '',
				'x.md': ''
			} });
			const store = buildPairedStore(false);

			await openCluster(
				app,
				store,
				'one'
			);

			expect(openPaths(
				app,
				store,
				'two'
			)).toEqual([]);
		});
	});
});