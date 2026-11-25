/** @file Tests for the tab actions and the commands built from them. */
import {
	describe,
	expect,
	it
} from 'vitest';
import {
	ADD_TO_CLUSTER,
	ADD_TO_MOST_RECENT_CLUSTER,
	buildTabActionCommand,
	CREATE_CLUSTER_FROM_ACTIVE_PANE,
	CREATE_CLUSTER_FROM_ACTIVE_TAB,
	getMenuTitle,
	REMOVE_FROM_CLUSTER,
	SET_READING_COMPANION,
	TAB_ACTIONS,
	type TabAction
} from './tabActions';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	addFileTab,
	addNonFileTab,
	buildStoreWith,
	choosing,
	choosingNothing,
	isAvailable,
	selecting,
	submitting
} from '../test/clusterHelpers';
import { buildDependencies } from '../test/dependencyHelpers';
import {
	buildCluster,
	buildStore
} from '../test/fakes';

describe('tab actions', () => {
	/**
	 * Builds an app whose most recent tab is `a.md`.
	 *
	 * @returns The app and the tab.
	 */
	async function setUp() {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		setMostRecentLeaf(
			app,
			leaf
		);
		return {
			app,
			leaf
		};
	}

	it('gives each command its id and name', () => {
		const app = createFakeWorkspaceApp();
		const dependencies = buildDependencies(
			app,
			buildStore()
		);

		const commands = TAB_ACTIONS.map((action) => buildTabActionCommand(
			dependencies,
			action
		));

		expect(commands.map((command) => [
			command.id,
			command.name
		])).toEqual([
			[
				'create-cluster-from-active-tab',
				'Create cluster from active tab'
			],
			[
				'create-cluster-from-active-pane',
				'Create cluster from active pane'
			],
			[
				'add-to-cluster',
				'Add to cluster'
			],
			[
				'add-to-most-recent-cluster',
				'Add to most recent cluster'
			],
			[
				'remove-from-cluster',
				'Remove from cluster'
			],
			[
				'set-reading-companion',
				'Set reading companion'
			],
		]);
	});

	describe('buildTabActionCommand', () => {
		it('is unavailable when there is no most recent tab', () => {
			const command = buildTabActionCommand(
				buildDependencies(
					createFakeWorkspaceApp(),
					buildStore()
				),
				CREATE_CLUSTER_FROM_ACTIVE_TAB
			);

			const result = isAvailable(command);

			expect(result).toBe(false);
		});

		it('checks availability without running the action', async () => {
			const { app } = await setUp();
			let ran = false;
			const action: TabAction = {
				...CREATE_CLUSTER_FROM_ACTIVE_TAB,
				run: () => {
					ran = true;
				},
			};
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					buildStore()
				),
				action
			);

			const result = isAvailable(command);

			expect([
				result,
				ran
			]).toEqual([
				true,
				false
			]);
		});

		it('runs the action on the most recent tab', async () => {
			const { app } = await setUp();
			let target: unknown = null;
			const action: TabAction = {
				...CREATE_CLUSTER_FROM_ACTIVE_TAB,
				run: (leaf) => {
					target = leaf;
				},
			};
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					buildStore()
				),
				action
			);

			command.checkCallback?.(false);

			expect(target).toBe(app.workspace.getMostRecentLeaf());
		});
	});

	describe('create from tab', () => {
		it('is available for a file-backed tab and not for another', async () => {
			const { app } = await setUp();
			const other = await addNonFileTab(
				app,
				{}
			);
			const dependencies = buildDependencies(
				app,
				buildStore()
			);

			const results = [
				app.workspace.getMostRecentLeaf(),
				other
			].map((leaf) => leaf !== null && CREATE_CLUSTER_FROM_ACTIVE_TAB.isAvailable(
				leaf,
				dependencies
			));

			expect(results).toEqual([
				true,
				false
			]);
		});

		it('creates a Cluster holding the tab\'s file', async () => {
			const { app } = await setUp();
			const store = buildStore();
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					store,
					{ promptForCluster: submitting({ name: 'New' }).prompt }
				),
				CREATE_CLUSTER_FROM_ACTIVE_TAB
			);

			command.checkCallback?.(false);
			await Promise.resolve();

			expect(Object.values(store.get().clusters).map((cluster) => cluster.members)).toEqual([['a.md']]);
		});
	});

	describe('create from pane', () => {
		it('is unavailable for a pane with no file-backed tab', async () => {
			const app = createFakeWorkspaceApp();
			const leaf = await addNonFileTab(
				app,
				{}
			);

			const result = CREATE_CLUSTER_FROM_ACTIVE_PANE.isAvailable(
				leaf,
				buildDependencies(
					app,
					buildStore()
				)
			);

			expect(result).toBe(false);
		});

		it('creates a Cluster holding the pane\'s files', async () => {
			const { app } = await setUp();
			const store = buildStore();
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					store,
					{ promptForCluster: submitting({ name: 'Pane' }).prompt }
				),
				CREATE_CLUSTER_FROM_ACTIVE_PANE
			);

			command.checkCallback?.(false);
			await Promise.resolve();

			expect(Object.values(store.get().clusters).map((cluster) => cluster.members)).toEqual([['a.md']]);
		});
	});

	describe('add to cluster', () => {
		it('is available only when a Cluster exists', async () => {
			const { 
				leaf, 
				app 
			} = await setUp();

			const results = [
				buildStore(),
				buildStoreWith(buildCluster())
			].map((store) => ADD_TO_CLUSTER.isAvailable(
				leaf,
				buildDependencies(
					app,
					store
				)
			));

			expect(results).toEqual([
				false,
				true
			]);
		});

		it('adds the file to the chosen Cluster', async () => {
			const { app } = await setUp();
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					store,
					{ promptForClusterChoice: choosing('one').prompt }
				),
				ADD_TO_CLUSTER
			);

			command.checkCallback?.(false);

			expect(store.get().clusters['one'].members).toEqual(['a.md']);
		});

		it('does not prompt when only checking availability', async () => {
			const { app } = await setUp();
			const {
				prompt,
				spy
			} = choosingNothing();
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					buildStoreWith(buildCluster()),
					{ promptForClusterChoice: prompt }
				),
				ADD_TO_CLUSTER
			);

			isAvailable(command);

			expect(spy).not.toHaveBeenCalled();
		});
	});

	describe('add to most recent cluster', () => {
		it('adds the file to the Cluster with the highest lastTouchedAt', async () => {
			const { app } = await setUp();
			const store = buildStoreWith(
				buildCluster({
					id: 'one',
					lastTouchedAt: 1
				}),
				buildCluster({
					id: 'two',
					lastTouchedAt: 9
				})
			);
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					store
				),
				ADD_TO_MOST_RECENT_CLUSTER
			);

			command.checkCallback?.(false);

			expect(store.get().clusters['two'].members).toEqual(['a.md']);
		});

		it('stays a command when the most recent Cluster holds the file, but hides its menu item', async () => {
			const { 
				app, 
				leaf 
			} = await setUp();
			const dependencies = buildDependencies(
				app,
				buildStoreWith(buildCluster({ members: ['a.md'] }))
			);

			const results = [
				ADD_TO_MOST_RECENT_CLUSTER.isAvailable(
					leaf,
					dependencies
				),
				getMenuTitle(
					ADD_TO_MOST_RECENT_CLUSTER,
					leaf,
					dependencies
				)
			];

			expect(results).toEqual([
				true,
				null
			]);
		});

		it('names the most recent Cluster in its menu title', async () => {
			const { 
				app, 
				leaf 
			} = await setUp();

			const title = getMenuTitle(
				ADD_TO_MOST_RECENT_CLUSTER,
				leaf,
				buildDependencies(
					app,
					buildStoreWith(buildCluster({ name: 'Reading' }))
				)
			);

			expect(title).toBe('Add to Reading');
		});
	});

	describe('remove from cluster', () => {
		it('is available only when a Cluster holds the file', async () => {
			const { 
				app, 
				leaf 
			} = await setUp();

			const results = [
				buildStoreWith(buildCluster({ members: ['other.md'] })),
				buildStoreWith(buildCluster({ members: ['a.md'] }))
			].map((store) => REMOVE_FROM_CLUSTER.isAvailable(
				leaf,
				buildDependencies(
					app,
					store
				)
			));

			expect(results).toEqual([
				false,
				true
			]);
		});

		it('removes the file from the selected Clusters', async () => {
			const { app } = await setUp();
			const store = buildStoreWith(
				buildCluster({
					id: 'one',
					members: ['a.md']
				}),
				buildCluster({
					id: 'two',
					members: ['a.md']
				})
			);
			const command = buildTabActionCommand(
				buildDependencies(
					app,
					store,
					{ promptForClusterRemoval: selecting(['one']).prompt }
				),
				REMOVE_FROM_CLUSTER
			);

			command.checkCallback?.(false);
			await Promise.resolve();

			expect([
				store.get().clusters['one'].members,
				store.get().clusters['two'].members
			]).toEqual([
				[],
				['a.md']
			]);
		});
	});

	describe('set reading companion', () => {
		it('is unavailable when there are no Clusters', async () => {
			const { 
				app, 
				leaf 
			} = await setUp();

			const result = SET_READING_COMPANION.isAvailable(
				leaf,
				buildDependencies(
					app,
					buildStore()
				)
			);

			expect(result).toBe(false);
		});

		it('makes the tab the companion of the chosen Cluster', async () => {
			const { app } = await setUp();
			const dependencies = buildDependencies(
				app,
				buildStoreWith(buildCluster({ id: 'cluster-a' })),
				{ promptForClusterChoice: choosing('cluster-a').prompt }
			);
			const command = buildTabActionCommand(
				dependencies,
				SET_READING_COMPANION
			);

			command.checkCallback?.(false);

			expect(dependencies.readingCompanion.isSet()).toBe(true);
		});
	});

	describe('getMenuTitle', () => {
		it('uses the command name when the action has no menu title', async () => {
			const { 
				app, 
				leaf 
			} = await setUp();

			const title = getMenuTitle(
				ADD_TO_CLUSTER,
				leaf,
				buildDependencies(
					app,
					buildStoreWith(buildCluster())
				)
			);

			expect(title).toBe('Add to cluster');
		});

		it('returns null for an unavailable action', async () => {
			const { 
				app, 
				leaf 
			} = await setUp();

			const title = getMenuTitle(
				ADD_TO_CLUSTER,
				leaf,
				buildDependencies(
					app,
					buildStore()
				)
			);

			expect(title).toBeNull();
		});
	});
});
