/** @file Tests for the Cluster Tray view. */
import { App, WorkspaceLeaf } from 'obsidian';
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
import { buildCluster, createConfiguredApp } from '../test/fakes';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../app/ClusterTray', () => ({
	default: ({ clusterId, onConfirmUnlink, onOpenMember, onPair }: {
		clusterId: string | null;
		onConfirmUnlink: (id: string) => void;
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
		</>
	),
}));

const { ClusterTrayView } = await import('./ClusterTrayView');

/**
 * Builds a view over a fresh leaf.
 *
 * @param app - The app.
 * @param store - The store.
 * @param trayReturn - The return tracker.
 * @returns The view.
 */
function buildView(
	app: App,
	store: SettingsStore,
	trayReturn: TrayReturnTracker = { openMember: vi.fn() } as unknown as TrayReturnTracker,
	pairing: { onConfirmUnlink?: (id: string) => void; onPair?: (id: string) => void } = {}
) {
	const leaf: WorkspaceLeaf = app.workspace.getLeaf(true);
	return new ClusterTrayView(
		store,
		trayReturn,
		pairing.onPair ?? (() => {}),
		pairing.onConfirmUnlink ?? (() => {}),
		leaf
	);
}

describe('ClusterTrayView', () => {
	it('has its view type, icon and a generic title before it has a Cluster', () => {
		const view = buildView(createConfiguredApp(), buildStoreWith());

		expect([view.getViewType(), view.getIcon(), view.getDisplayText()]).toEqual([
			CLUSTER_TRAY_VIEW_TYPE,
			'layers',
			'Cluster tray',
		]);
	});

	it('takes its title from the Cluster it shows', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith(buildCluster({ id: 'one', name: 'Reading' })));

		await act(async () => {
			await view.onOpen();
			await view.setState({ clusterId: 'one' }, { history: false });
		});

		expect(view.getDisplayText()).toBe('Reading');
	});

	it('saves the Cluster it shows in its state', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith(buildCluster({ id: 'one' })));

		await act(async () => {
			await view.onOpen();
			await view.setState({ clusterId: 'one' }, { history: false });
		});

		expect(view.getState()).toEqual({ clusterId: 'one' });
	});

	it('renders the Tray for the restored Cluster', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith(buildCluster({ id: 'one' })));

		await act(async () => {
			await view.onOpen();
			await view.setState({ clusterId: 'one' }, { history: false });
		});

		expect(view.contentEl.querySelector('[data-testid="tray-marker"]')?.textContent).toBe('one');
	});

	it('renders nothing until its state is applied', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith(buildCluster({ id: 'one' })));

		await act(async () => {
			await view.onOpen();
		});

		expect(view.contentEl.querySelector('[data-testid="tray-marker"]')).toBeNull();
	});

	it('renders the Tray when its state is applied before it opens', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith(buildCluster({ id: 'one' })));

		await act(async () => {
			await view.setState({ clusterId: 'one' }, { history: false });
			await view.onOpen();
		});

		expect(view.contentEl.querySelector('[data-testid="tray-marker"]')?.textContent).toBe('one');
	});

	it('ignores a Cluster id that is not a string', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith());

		await act(async () => {
			await view.onOpen();
			await view.setState({ clusterId: 4 }, { history: false });
		});

		expect(view.getState()).toEqual({ clusterId: null });
	});

	it('unmounts its React root when closed', async () => {
		const view = buildView(createConfiguredApp(), buildStoreWith());
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
			await view.setState({ clusterId: 'one' }, { history: false });
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
			{ onConfirmUnlink, onPair }
		);
		await act(async () => {
			await view.onOpen();
			await view.setState({ clusterId: 'one' }, { history: false });
		});

		act(() => {
			(view.contentEl.querySelector('[data-testid="pair-marker"]') as HTMLElement).click();
			(view.contentEl.querySelector('[data-testid="unlink-marker"]') as HTMLElement).click();
		});

		expect([onPair.mock.calls, onConfirmUnlink.mock.calls]).toEqual([[['paired']], [['unlinked']]]);
	});
});