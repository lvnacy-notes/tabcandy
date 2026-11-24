/** @file Tests for the Cluster Tray view. */
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
import type TrayReturnTracker from './TrayReturnTracker';
import SettingsStore from '../settings/SettingsStore';
import { buildStoreWith } from '../test/clusterHelpers';
import {
	buildCluster,
	createConfiguredApp
} from '../test/fakes';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Replaces the Tray component with markers that report the props it was given. */
vi.mock('../app/ClusterTray', () => ({ default: ({
	clusterId,
	onConfirmUnlink,
	onDeleteCluster,
	onEditCluster,
	onOpenMember,
	onPair
}: {
	clusterId: string | null;
	onConfirmUnlink: (id: string) => void;
	onDeleteCluster: (id: string) => void;
	onEditCluster: (id: string) => void;
	onOpenMember?: (path: string) => void;
	onPair: (id: string) => void;
}) => (
	<>
		<button
			data-testid = 'tray-marker'
			onClick = { () => onOpenMember?.('a.md') }
		>
			{ clusterId ?? 'none' }
		</button>
		<button
			data-testid = 'pair-marker'
			onClick = { () => onPair('paired') }
		/>
		<button
			data-testid = 'unlink-marker'
			onClick = { () => onConfirmUnlink('unlinked') }
		/>
		<button
			data-testid = 'edit-marker'
			onClick = { () => onEditCluster('edited') }
		/>
		<button
			data-testid = 'delete-marker'
			onClick = { () => onDeleteCluster('deleted') }
		/>
	</>
) }));

const { ClusterTrayView } = await import('./ClusterTrayView');

/**
 * Builds a view over a fresh leaf.
 *
 * @param app - The app.
 * @param store - The store.
 * @param trayReturn - The return tracker.
 * @param pairing - Called with a Cluster's id to pair it or to unlink it after a confirmation.
 * @param management - Called with a Cluster's id to edit it or to delete it after a confirmation.
 * @returns The view.
 */
function buildView(
	app: App,
	store: SettingsStore,
	trayReturn: TrayReturnTracker = { openMember: vi.fn() } as unknown as TrayReturnTracker,
	pairing: {
		onConfirmUnlink?: (id: string) => void;
		onPair?: (id: string) => void
	} = {},
	management: {
		onDeleteCluster?: (id: string) => void;
		onEditCluster?: (id: string) => void
	} = {}
) {
	const leaf: WorkspaceLeaf = app.workspace.getLeaf(true);
	return new ClusterTrayView(
		store,
		trayReturn,
		pairing.onPair ?? (() => {}),
		pairing.onConfirmUnlink ?? (() => {}),
		management.onEditCluster ?? (() => {}),
		management.onDeleteCluster ?? (() => {}),
		leaf
	);
}

/**
 * Renames a Cluster in the store.
 *
 * @param store - The store.
 * @param id - Id of the Cluster.
 * @param name - The new name.
 */
async function rename(store: SettingsStore, id: string, name: string): Promise<void> {
	await act(async () => {
		await store.update({ clusters: { [id]: {
			...store.get().clusters[id],
			name
		} } });
	});
}

/**
 * Opens a view on a Cluster.
 *
 * @param view - The view.
 * @param id - Id of the Cluster.
 */
async function openOn(view: ReturnType<typeof buildView>, id: string): Promise<void> {
	await act(async () => {
		await view.onOpen();
		await view.setState(
			{ clusterId: id },
			{ history: false }
		);
	});
}

describe('ClusterTrayView', () => {
	it('has its view type, icon and a generic title before it has a Cluster', () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith()
		);

		expect([
			view.getViewType(),
			view.getIcon(),
			view.getDisplayText()
		]).toEqual([
			CLUSTER_TRAY_VIEW_TYPE,
			'layers',
			'Cluster tray',
		]);
	});

	it('takes its title from the Cluster it shows', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({
				id: 'one',
				name: 'Reading'
			}))
		);

		await act(async () => {
			await view.onOpen();
			await view.setState(
				{ clusterId: 'one' },
				{ history: false }
			);
		});

		expect(view.getDisplayText()).toBe('Reading');
	});

	it('saves the Cluster it shows in its state', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ id: 'one' }))
		);

		await act(async () => {
			await view.onOpen();
			await view.setState(
				{ clusterId: 'one' },
				{ history: false }
			);
		});

		expect(view.getState()).toEqual({ clusterId: 'one' });
	});

	it('renders the Tray for the restored Cluster', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ id: 'one' }))
		);

		await act(async () => {
			await view.onOpen();
			await view.setState(
				{ clusterId: 'one' },
				{ history: false }
			);
		});

		expect(view.contentEl.querySelector('[data-testid="tray-marker"]')?.textContent).toBe('one');
	});

	it('renders nothing until its state is applied', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ id: 'one' }))
		);

		await act(async () => {
			await view.onOpen();
		});

		expect(view.contentEl.querySelector('[data-testid="tray-marker"]')).toBeNull();
	});

	it('renders the Tray when its state is applied before it opens', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ id: 'one' }))
		);

		await act(async () => {
			await view.setState(
				{ clusterId: 'one' },
				{ history: false }
			);
			await view.onOpen();
		});

		expect(view.contentEl.querySelector('[data-testid="tray-marker"]')?.textContent).toBe('one');
	});

	it('ignores a Cluster id that is not a string', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith()
		);

		await act(async () => {
			await view.onOpen();
			await view.setState(
				{ clusterId: 4 },
				{ history: false }
			);
		});

		expect(view.getState()).toEqual({ clusterId: null });
	});

	it('unmounts its React root when closed', async () => {
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith()
		);
		await act(async () => {
			await view.onOpen();
		});

		await act(async () => {
			await view.onClose();
		});

		expect(view.root).toBeNull();
	});

	it('opens a clicked member through the return tracker, from its own leaf', async () => {
		const openMember = vi.fn();
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ id: 'one' })),
			{ openMember } as unknown as TrayReturnTracker
		);
		await act(async () => {
			await view.onOpen();
			await view.setState(
				{ clusterId: 'one' },
				{ history: false }
			);
		});

		act(() => {
			(view.contentEl.querySelector('[data-testid="tray-marker"]') as HTMLElement).click();
		});

		expect(openMember).toHaveBeenCalledWith(
			view.leaf,
			'one',
			'a.md'
		);
	});

	it('hands the Tray its pairing callbacks', async () => {
		const onPair = vi.fn();
		const onConfirmUnlink = vi.fn();
		const view = buildView(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ id: 'one' })),
			undefined,
			{
				onConfirmUnlink,
				onPair
			}
		);
		await act(async () => {
			await view.onOpen();
			await view.setState(
				{ clusterId: 'one' },
				{ history: false }
			);
		});

		act(() => {
			(view.contentEl.querySelector('[data-testid="pair-marker"]') as HTMLElement).click();
			(view.contentEl.querySelector('[data-testid="unlink-marker"]') as HTMLElement).click();
		});

		expect([
			onPair.mock.calls,
			onConfirmUnlink.mock.calls
		]).toEqual([
			[['paired']],
			[['unlinked']]
		]);
	});

	describe('tab title', () => {
		it('re-applies the leaf\'s view state when the Cluster is renamed', async () => {
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const view = buildView(
				createConfiguredApp(),
				store
			);
			await openOn(
				view,
				'one'
			);
			const setViewState = vi.spyOn(
				view.leaf,
				'setViewState'
			).mockResolvedValue();

			await rename(
				store,
				'one',
				'Renamed'
			);

			expect(setViewState).toHaveBeenCalledTimes(1);
		});

		it('leaves the leaf alone when a change does not touch the title', async () => {
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const view = buildView(
				createConfiguredApp(),
				store
			);
			await openOn(
				view,
				'one'
			);
			const setViewState = vi.spyOn(
				view.leaf,
				'setViewState'
			).mockResolvedValue();

			await act(async () => {
				await store.update({ replaceEmptyTabsWithTabCandy: false });
			});

			expect(setViewState).not.toHaveBeenCalled();
		});

		it('stops watching once closed', async () => {
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const view = buildView(
				createConfiguredApp(),
				store
			);
			await openOn(
				view,
				'one'
			);
			const setViewState = vi.spyOn(
				view.leaf,
				'setViewState'
			).mockResolvedValue();
			await act(async () => {
				await view.onClose();
			});

			await rename(
				store,
				'one',
				'Renamed'
			);

			expect(setViewState).not.toHaveBeenCalled();
		});

		it('watches once, not once per open, after reopening', async () => {
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const view = buildView(
				createConfiguredApp(),
				store
			);
			await openOn(
				view,
				'one'
			);
			await act(async () => {
				await view.onClose();
				await view.onOpen();
			});
			const setViewState = vi.spyOn(
				view.leaf,
				'setViewState'
			).mockResolvedValue();

			await rename(
				store,
				'one',
				'Renamed'
			);

			expect(setViewState).toHaveBeenCalledTimes(1);
		});

		it('re-applies the leaf\'s view state when the Cluster is deleted', async () => {
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const view = buildView(
				createConfiguredApp(),
				store
			);
			await openOn(
				view,
				'one'
			);
			const setViewState = vi.spyOn(
				view.leaf,
				'setViewState'
			).mockResolvedValue();

			await act(async () => {
				await store.update({ clusters: {} });
			});

			expect(setViewState).toHaveBeenCalledTimes(1);
		});
	});

	describe('open -> close -> reopen', () => {
		it('does not leak a second root: content after reopen matches a single mount', async () => {
			const view = buildView(
				createConfiguredApp(),
				buildStoreWith(buildCluster({ id: 'one' }))
			);
			await openOn(
				view,
				'one'
			);

			await act(async () => {
				await view.onClose();
				await view.onOpen();
			});

			expect(view.contentEl.querySelectorAll('[data-testid="tray-marker"]')).toHaveLength(1);
		});

		it('survives repeated open and close cycles', async () => {
			const view = buildView(
				createConfiguredApp(),
				buildStoreWith(buildCluster({ id: 'one' }))
			);
			await openOn(
				view,
				'one'
			);

			for (let cycle = 0; cycle < 5; cycle++) {
				await act(async () => {
					await view.onClose();
					await view.onOpen();
				});
			}

			expect(view.contentEl.querySelectorAll('[data-testid="tray-marker"]')).toHaveLength(1);
		});
	});

	describe('multiple leaves', () => {
		it('mounts independently per leaf: closing one view does not clear another', async () => {
			const app = createConfiguredApp();
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			const viewOne = buildView(
				app,
				store
			);
			const viewTwo = buildView(
				app,
				store
			);
			await openOn(
				viewOne,
				'one'
			);
			await openOn(
				viewTwo,
				'one'
			);

			await act(async () => {
				await viewOne.onClose();
			});

			expect([
				viewOne.contentEl.querySelector('[data-testid="tray-marker"]'),
				viewTwo.contentEl.querySelector('[data-testid="tray-marker"]') === null
			]).toEqual([
				null,
				false
			]);
		});
	});
});