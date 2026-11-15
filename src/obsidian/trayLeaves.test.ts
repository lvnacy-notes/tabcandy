/** @file Tests for finding and opening Tray leaves. */
import { App, WorkspaceLeaf } from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	getTrayClusterId,
	openClusterTray,
	openClusterTrayAt
} from './trayLeaves';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

/**
 * Builds a stand-in leaf with a view state and a `setViewState` spy.
 *
 * @param state - The view state's `state`.
 * @returns The leaf and its spy.
 */
function buildLeaf(state: unknown): { leaf: WorkspaceLeaf; setViewState: ReturnType<typeof vi.fn> } {
	const setViewState = vi.fn().mockResolvedValue(undefined);
	return {
		leaf: {
			getViewState: () => ({ type: CLUSTER_TRAY_VIEW_TYPE, state }),
			setViewState,
		} as unknown as WorkspaceLeaf,
		setViewState,
	};
}

/**
 * Stubs the workspace calls the Tray opener makes.
 *
 * @param app - The fake app.
 * @param existing - The Tray leaves already open.
 * @param newTab - The leaf a new tab opens as.
 * @returns A spy on `revealLeaf`.
 */
function stubWorkspace(
	app: App,
	existing: WorkspaceLeaf[],
	newTab: WorkspaceLeaf
): ReturnType<typeof vi.fn> {
	vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue(existing);
	vi.spyOn(app.workspace, 'getLeaf').mockReturnValue(newTab);
	return vi.spyOn(app.workspace, 'revealLeaf').mockResolvedValue(undefined);
}

describe('getTrayClusterId', () => {
	it('reads the Cluster id from the leaf state', () => {
		const { leaf } = buildLeaf({ clusterId: 'one' });

		expect(getTrayClusterId(leaf)).toBe('one');
	});

	it('is null when the state has no Cluster id', () => {
		const { leaf } = buildLeaf({});

		expect(getTrayClusterId(leaf)).toBeNull();
	});

	it('is null when the Cluster id is not a string', () => {
		const { leaf } = buildLeaf({ clusterId: 3 });

		expect(getTrayClusterId(leaf)).toBeNull();
	});

	it('is null when the state is missing', () => {
		const { leaf } = buildLeaf(undefined);

		expect(getTrayClusterId(leaf)).toBeNull();
	});
});

describe('openClusterTray', () => {
	it('opens the Tray in a new tab', async () => {
		const app = createConfiguredApp();
		const { leaf, setViewState } = buildLeaf({});
		stubWorkspace(
			app,
			[],
			leaf
		);
		const store = buildStoreWith(buildCluster({ id: 'one' }));

		await openClusterTray(
			app,
			store,
			'one'
		);

		expect(setViewState).toHaveBeenCalledWith({
			type: CLUSTER_TRAY_VIEW_TYPE,
			active: true,
			state: { clusterId: 'one' },
		});
	});

	it('opens the Tray in the leaf it is given', async () => {
		const app = createConfiguredApp();
		const newTab = buildLeaf({});
		const given = buildLeaf({});
		stubWorkspace(
			app,
			[],
			newTab.leaf
		);
		const store = buildStoreWith(buildCluster({ id: 'one' }));

		await openClusterTray(
			app,
			store,
			'one',
			given.leaf
		);

		expect(given.setViewState).toHaveBeenCalledTimes(1);
		expect(newTab.setViewState).not.toHaveBeenCalled();
	});

	it('sets the Cluster\'s lastTouchedAt', async () => {
		const app = createConfiguredApp();
		stubWorkspace(
			app,
			[],
			buildLeaf({}).leaf
		);
		const store = buildStoreWith(buildCluster({ id: 'one', lastTouchedAt: 1 }));

		await openClusterTray(
			app,
			store,
			'one'
		);

		expect(store.get().clusters['one'].lastTouchedAt).toBeGreaterThan(1);
	});

	it('reveals an open Tray for the Cluster when jumping is on', async () => {
		const app = createConfiguredApp();
		const open = buildLeaf({ clusterId: 'one' });
		const other = buildLeaf({ clusterId: 'two' });
		const newTab = buildLeaf({});
		const reveal = stubWorkspace(
			app,
			[other.leaf, open.leaf],
			newTab.leaf
		);
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		await store.update({ jumpToExistingCluster: true });

		await openClusterTray(
			app,
			store,
			'one'
		);

		expect(reveal).toHaveBeenCalledWith(open.leaf);
		expect(newTab.setViewState).not.toHaveBeenCalled();
	});

	it('opens another Tray for the Cluster when jumping is off', async () => {
		const app = createConfiguredApp();
		const open = buildLeaf({ clusterId: 'one' });
		const newTab = buildLeaf({});
		const reveal = stubWorkspace(
			app,
			[open.leaf],
			newTab.leaf
		);
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		await store.update({ jumpToExistingCluster: false });

		await openClusterTray(
			app,
			store,
			'one'
		);

		expect(reveal).not.toHaveBeenCalled();
		expect(newTab.setViewState).toHaveBeenCalledTimes(1);
	});

	it('does nothing for a Cluster that does not exist', async () => {
		const app = createConfiguredApp();
		const newTab = buildLeaf({});
		stubWorkspace(
			app,
			[],
			newTab.leaf
		);
		const store = buildStoreWith(buildCluster({ id: 'one' }));

		await openClusterTray(
			app,
			store,
			'missing'
		);

		expect(newTab.setViewState).not.toHaveBeenCalled();
	});
});

describe('openClusterTrayAt', () => {
	/**
	 * Stubs a workspace with one root pane.
	 *
	 * @param app - The fake app.
	 * @returns The pane's element, the pane, the new-tab leaf and a spy on `setActiveLeaf`.
	 */
	function stubPane(app: App) {
		const element = createDiv();
		const pane = { view: { containerEl: element } } as unknown as WorkspaceLeaf;
		vi.spyOn(app.workspace, 'iterateRootLeaves').mockImplementation((callback) => {
			callback(pane);
		});
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf').mockImplementation(() => {});
		const newTab = buildLeaf({});
		stubWorkspace(
			app,
			[],
			newTab.leaf
		);
		return {
			element,
			newTab,
			pane,
			setActiveLeaf,
		};
	}

	it('opens the Tray as a new tab in the pane under the drop', async () => {
		const app = createConfiguredApp();
		const { element, newTab, pane, setActiveLeaf } = stubPane(app);
		const inside = element.appendChild(createSpan());

		await openClusterTrayAt(
			app,
			buildStoreWith(buildCluster({ id: 'one' })),
			'one',
			inside
		);

		expect(setActiveLeaf).toHaveBeenCalledWith(pane, { focus: true });
		expect(newTab.setViewState).toHaveBeenCalledTimes(1);
	});

	it('does nothing when the drop landed outside every pane', async () => {
		const app = createConfiguredApp();
		const { newTab, setActiveLeaf } = stubPane(app);

		await openClusterTrayAt(
			app,
			buildStoreWith(buildCluster({ id: 'one' })),
			'one',
			createDiv()
		);

		expect(setActiveLeaf).not.toHaveBeenCalled();
		expect(newTab.setViewState).not.toHaveBeenCalled();
	});

	it('does nothing when nothing is under the pointer', async () => {
		const app = createConfiguredApp();
		const { newTab } = stubPane(app);

		await openClusterTrayAt(
			app,
			buildStoreWith(buildCluster({ id: 'one' })),
			'one',
			null
		);

		expect(newTab.setViewState).not.toHaveBeenCalled();
	});
});