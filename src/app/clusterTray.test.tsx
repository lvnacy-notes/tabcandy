/** @file Tests for the Cluster Tray. */
import { act } from 'react';
import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	cleanup,
	fireEvent,
	render,
	screen
} from '@testing-library/react';
import ClusterTray from './ClusterTray';
import { buildStoreWith } from '../test/clusterHelpers';
import { 
	buildCluster, 
	createConfiguredApp 
} from '../test/fakes';
import { captureMenus } from '../test/menuHelpers';

/** Number of open members the mocked `getOpenMembers` reports. */
const openMembers = vi.hoisted(() => ({ size: 0 }));

/** Arguments of each call the mocked `openCluster` and `closeCluster` received. */
const calls = vi.hoisted((): { 
	opened: unknown[][]; 
	closed: unknown[][] 
} => ({ 
	opened: [], 
	closed: [] 
}));

/** Replaces opening and closing a Cluster with recorders. */
vi.mock('../obsidian/clusterOpenClose', () => ({
	/**
	 * Records a close.
	 *
	 * @param args - The arguments the Tray passed.
	 */
	closeCluster: (...args: unknown[]) => {
		calls.closed.push(args);
	},
	/**
	 * Reports the open members as a count.
	 *
	 * @returns An object holding `size`.
	 */
	getOpenMembers: () => ({ size: openMembers.size }),
	/**
	 * Records an open.
	 *
	 * @param args - The arguments the Tray passed.
	 */
	openCluster: (...args: unknown[]) => {
		calls.opened.push(args);
	},
}));

/** Replaces the resolve modal with one that opens nothing. */
vi.mock('../ui/ResolveMissingModal', () => ({default: class {
	/** Opens nothing. */
	open(): void {}
},}));

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(cleanup);

describe('ClusterTray', () => {
	it('shows the Cluster\'s name as a title and its members below', () => {
		const store = buildStoreWith(buildCluster({ 
			id: 'one', 
			name: 'Reading', 
			members: [
				'Notes/a.md', 
				'b.md'
			] 
		}));
		render(<ClusterTray
			app = { createConfiguredApp({ files: { 
				'Notes/a.md': '', 
				'b.md': '' 
			} }) }
			settingsStore = { store }
			clusterId = 'one'
			onConfirmUnlink = { () => {} }
			onDeleteCluster = { () => {} }
			onEditCluster = { () => {} }
			onPair = { () => {} }
		/>);

		expect(screen.getByRole(
			'heading', 
			{ name: 'Reading' }
		)).toBeDefined();
		expect(screen.getByText('a')).toBeDefined();
		expect(screen.getByText('b')).toBeDefined();
	});

	it('marks a missing member and offers to resolve it', () => {
		const store = buildStoreWith(buildCluster({ 
			id: 'one', 
			members: ['gone.md'] 
		}));
		render(<ClusterTray
			app = { createConfiguredApp() }
			settingsStore = { store }
			clusterId = 'one'
			onConfirmUnlink = { () => {} }
			onDeleteCluster = { () => {} }
			onEditCluster = { () => {} }
			onPair = { () => {} }
		/>);

		expect(document.querySelector('.tabcandy-member-row.is-unresolved')).not.toBeNull();
		expect(screen.getByRole(
			'button', 
			{ name: 'Resolve missing (1)' }
		)).toBeDefined();
	});

	it('shows an empty state when it has no Cluster', () => {
		render(<ClusterTray
			app = { createConfiguredApp() }
			settingsStore = { buildStoreWith() }
			clusterId = { null }
			onConfirmUnlink = { () => {} }
			onDeleteCluster = { () => {} }
			onEditCluster = { () => {} }
			onPair = { () => {} }
		/>);

		expect(screen.getByText('This cluster no longer exists.')).toBeDefined();
	});

	it('shows the empty state live when its Cluster is deleted', async () => {
		const store = buildStoreWith(buildCluster({ 
			id: 'one', 
			name: 'Reading' 
		}));
		render(<ClusterTray
			app = { createConfiguredApp() }
			settingsStore = { store }
			clusterId = 'one'
			onConfirmUnlink = { () => {} }
			onDeleteCluster = { () => {} }
			onEditCluster = { () => {} }
			onPair = { () => {} }
		/>);

		await act(async () => {
			await store.update({ clusters: {} });
		});

		expect(screen.getByText('This cluster no longer exists.')).toBeDefined();
		expect(screen.queryByRole(
			'heading', 
			{ name: 'Reading' }
		)).toBeNull();
	});

	it('shows a rename live', async () => {
		const store = buildStoreWith(buildCluster({ 
			id: 'one', 
			name: 'Reading' 
		}));
		render(<ClusterTray
			app = { createConfiguredApp() }
			settingsStore = { store }
			clusterId = 'one'
			onConfirmUnlink = { () => {} }
			onDeleteCluster = { () => {} }
			onEditCluster = { () => {} }
			onPair = { () => {} }
		/>);

		await act(async () => {
			await store.update({ clusters: { one: buildCluster({ 
				id: 'one', 
				name: 'Writing' 
			}) } });
		});

		expect(screen.getByRole(
			'heading', 
			{ name: 'Writing' }
		)).toBeDefined();
	});

	it('hands a clicked member to onOpenMember when it is given', () => {
		const onOpenMember = vi.fn();
		const store = buildStoreWith(buildCluster({ 
			id: 'one', 
			members: ['b.md'] 
		}));
		render(<ClusterTray
			app = { createConfiguredApp({ files: { 'b.md': '' } }) }
			settingsStore = { store }
			clusterId = 'one'
			onOpenMember = { onOpenMember }
			onConfirmUnlink = { () => {} }
			onDeleteCluster = { () => {} }
			onEditCluster = { () => {} }
			onPair = { () => {} }
		/>);

		fireEvent.click(screen.getByText('b'));

		expect(onOpenMember).toHaveBeenCalledWith('b.md');
	});

	describe('options menu', () => {
		it('offers Open cluster and Pair with… from the options button, and no Open tray', () => {
			const menus = captureMenus();
			render(<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { buildStoreWith(buildCluster({ id: 'one' })) }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onDeleteCluster = { () => {} }
				onEditCluster = { () => {} }
				onPair = { () => {} }
			/>);

			fireEvent.click(screen.getByRole(
				'button', 
				{ name: 'Cluster options' }
			));

			expect(menus[0].menuItems__.map((item) => item.title__)).toEqual([
				'Open cluster', 
				'Edit cluster',
				'Delete cluster',
				'Pair with…'
			]);
		});

		it('opens the same menu from a right-click on the title', () => {
			const menus = captureMenus();
			render(<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { buildStoreWith(buildCluster({ 
					id: 'one', 
					name: 'Reading' 
				})) }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onDeleteCluster = { () => {} }
				onEditCluster = { () => {} }
				onPair = { () => {} }
			/>);

			fireEvent.contextMenu(screen.getByRole(
				'heading', 
				{ name: 'Reading' }
			));

			expect(menus[0].menuItems__.map((item) => item.title__)).toEqual([
				'Open cluster', 
				'Edit cluster',
				'Delete cluster',
				'Pair with…'
			]);
		});

		it('opens the Cluster when Open cluster is chosen', () => {
			calls.opened.length = 0;
			const menus = captureMenus();
			const app = createConfiguredApp();
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			render(<ClusterTray
				app = { app }
				settingsStore = { store }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onDeleteCluster = { () => {} }
				onEditCluster = { () => {} }
				onPair = { () => {} }
			/>);

			fireEvent.click(screen.getByRole(
				'button', 
				{ name: 'Cluster options' }
			));
			menus[0].menuItems__[0].onClick__?.(new MouseEvent('click'));

			expect(calls.opened).toEqual([[
				app, 
				store, 
				'one'
			]]);
		});

		it('offers Close cluster while a member is open and closes the Cluster when chosen', () => {
			calls.closed.length = 0;
			openMembers.size = 1;
			const menus = captureMenus();
			const app = createConfiguredApp();
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			render(<ClusterTray
				app = { app }
				settingsStore = { store }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onDeleteCluster = { () => {} }
				onEditCluster = { () => {} }
				onPair = { () => {} }
			/>);

			fireEvent.click(screen.getByRole(
				'button', 
				{ name: 'Cluster options' }
			));
			const items = menus[0].menuItems__;
			items[1].onClick__?.(new MouseEvent('click'));
			openMembers.size = 0;

			expect([
				items.map((item) => item.title__), 
				calls.closed
			]).toEqual([
				[
					'Open cluster', 
					'Close cluster', 
					'Edit cluster',
					'Delete cluster',
					'Pair with…'
				],
				[[
					app, 
					store, 
					'one'
				]],
			]);
		});

		it('starts pairing the Cluster when Pair with… is chosen', () => {
			const onPair = vi.fn();
			const menus = captureMenus();
			render(<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { buildStoreWith(buildCluster({ id: 'one' })) }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onDeleteCluster = { () => {} }
				onEditCluster = { () => {} }
				onPair = { onPair }
			/>);

			fireEvent.click(screen.getByRole(
				'button', 
				{ name: 'Cluster options' }
			));
			menus[0].menuItems__[3].onClick__?.(new MouseEvent('click'));

			expect(onPair).toHaveBeenCalledWith('one');
		});

		it('offers Unlink, not Pair with…, when the Cluster is paired', () => {
			const onConfirmUnlink = vi.fn();
			const menus = captureMenus();
			render(<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { buildStoreWith(
					buildCluster({ 
						id: 'one', 
						pairedWith: 'two' 
					}), 
					buildCluster({ 
						id: 'two', 
						pairedWith: 'one' 
					})
				) }
				clusterId = 'one'
				onConfirmUnlink = { onConfirmUnlink }
				onDeleteCluster = { () => {} }
				onEditCluster = { () => {} }
				onPair = { () => {} }
			/>);

			fireEvent.click(screen.getByRole(
				'button', 
				{ name: 'Cluster options' }
			));
			const items = menus[0].menuItems__;
			items[3].onClick__?.(new MouseEvent('click'));

			expect([
				items.map((item) => item.title__), 
				onConfirmUnlink.mock.calls
			]).toEqual([
				[
					'Open cluster', 
					'Edit cluster',
					'Delete cluster',
					'Unlink'
				], 
				[['one']]
			]);
		});
	});
});