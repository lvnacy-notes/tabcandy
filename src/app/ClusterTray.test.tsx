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
	screen,
	waitFor
} from '@testing-library/react';
import { Menu } from 'obsidian';
import { Menu as MenuMock } from 'obsidian-test-mocks/obsidian';
import ClusterTray from './ClusterTray';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';

const openMembers = vi.hoisted(() => ({ size: 0 }));
const calls = vi.hoisted((): { opened: unknown[][]; closed: unknown[][] } => ({ opened: [], closed: [] }));

vi.mock('../obsidian/clusterOpenClose', () => ({
	closeCluster: (...args: unknown[]) => {
		calls.closed.push(args);
	},
	getOpenMembers: () => ({ size: openMembers.size }),
	openCluster: (...args: unknown[]) => {
		calls.opened.push(args);
	},
}));

vi.mock('../ui/ResolveMissingModal', () => ({
	default: class {
		open(): void {}
	},
}));

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(cleanup);

describe('ClusterTray', () => {
	it('shows the Cluster\'s name as a title and its members below', () => {
		const store = buildStoreWith(buildCluster({ id: 'one', name: 'Reading', members: ['Notes/a.md', 'b.md'] }));
		render(
			<ClusterTray
				app = { createConfiguredApp({ files: { 'Notes/a.md': '', 'b.md': '' } }) }
				settingsStore = { store }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onPair = { () => {} }
			/>
		);

		expect(screen.getByRole('heading', { name: 'Reading' })).toBeDefined();
		expect(screen.getByText('a')).toBeDefined();
		expect(screen.getByText('b')).toBeDefined();
	});

	it('marks a missing member and offers to resolve it', () => {
		const store = buildStoreWith(buildCluster({ id: 'one', members: ['gone.md'] }));
		render(
			<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { store }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onPair = { () => {} }
			/>
		);

		expect(document.querySelector('.tabcandy-member-row.is-unresolved')).not.toBeNull();
		expect(screen.getByRole('button', { name: 'Resolve missing (1)' })).toBeDefined();
	});

	it('shows an empty state when it has no Cluster', () => {
		render(
			<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { buildStoreWith() }
				clusterId = { null }
				onConfirmUnlink = { () => {} }
				onPair = { () => {} }
			/>
		);

		expect(screen.getByText('This cluster no longer exists.')).toBeDefined();
	});

	it('shows the empty state live when its Cluster is deleted', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one', name: 'Reading' }));
		render(
			<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { store }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onPair = { () => {} }
			/>
		);

		await act(async () => {
			await store.update({ clusters: {} });
		});

		await waitFor(() => {
			expect(screen.getByText('This cluster no longer exists.')).toBeDefined();
		});
		expect(screen.queryByRole('heading', { name: 'Reading' })).toBeNull();
	});

	it('shows a rename live', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one', name: 'Reading' }));
		render(
			<ClusterTray
				app = { createConfiguredApp() }
				settingsStore = { store }
				clusterId = 'one'
				onConfirmUnlink = { () => {} }
				onPair = { () => {} }
			/>
		);

		await act(async () => {
			await store.update({ clusters: { one: buildCluster({ id: 'one', name: 'Writing' }) } });
		});

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: 'Writing' })).toBeDefined();
		});
	});

	it('hands a clicked member to onOpenMember when it is given', () => {
		const onOpenMember = vi.fn();
		const store = buildStoreWith(buildCluster({ id: 'one', members: ['b.md'] }));
		render(
			<ClusterTray
				app = { createConfiguredApp({ files: { 'b.md': '' } }) }
				settingsStore = { store }
				clusterId = 'one'
				onOpenMember = { onOpenMember }
				onConfirmUnlink = { () => {} }
				onPair = { () => {} }
			/>
		);

		fireEvent.click(screen.getByText('b'));

		expect(onOpenMember).toHaveBeenCalledWith('b.md');
	});

	describe('options menu', () => {
		/**
		 * Captures the menus the Tray opens.
		 *
		 * @returns The captured menus.
		 */
		function captureMenus(): MenuMock[] {
			const menus: MenuMock[] = [];
			vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function (this: Menu) {
				menus.push(this as unknown as MenuMock);
				return this;
			});
			return menus;
		}

		it('offers Open cluster and Pair with… from the options button, and no Open tray', () => {
			const menus = captureMenus();
			render(
				<ClusterTray
					app = { createConfiguredApp() }
					settingsStore = { buildStoreWith(buildCluster({ id: 'one' })) }
					clusterId = 'one'
					onConfirmUnlink = { () => {} }
					onPair = { () => {} }
				/>
			);

			fireEvent.click(screen.getByRole('button', { name: 'Cluster options' }));

			expect(menus[0].menuItems__.map((item) => item.title__)).toEqual(['Open cluster', 'Pair with…']);
		});

		it('opens the same menu from a right-click on the title', () => {
			const menus = captureMenus();
			render(
				<ClusterTray
					app = { createConfiguredApp() }
					settingsStore = { buildStoreWith(buildCluster({ id: 'one', name: 'Reading' })) }
					clusterId = 'one'
					onConfirmUnlink = { () => {} }
					onPair = { () => {} }
				/>
			);

			fireEvent.contextMenu(screen.getByRole('heading', { name: 'Reading' }));

			expect(menus[0].menuItems__.map((item) => item.title__)).toEqual(['Open cluster', 'Pair with…']);
		});

		it('opens the Cluster when Open cluster is chosen', () => {
			calls.opened.length = 0;
			const menus = captureMenus();
			const app = createConfiguredApp();
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			render(
				<ClusterTray
					app = { app }
					settingsStore = { store }
					clusterId = 'one'
					onConfirmUnlink = { () => {} }
					onPair = { () => {} }
				/>
			);

			fireEvent.click(screen.getByRole('button', { name: 'Cluster options' }));
			menus[0].menuItems__[0].onClick__?.(new MouseEvent('click'));

			expect(calls.opened).toEqual([[app, store, 'one']]);
		});

		it('offers Close cluster while a member is open and closes the Cluster when chosen', () => {
			calls.closed.length = 0;
			openMembers.size = 1;
			const menus = captureMenus();
			const app = createConfiguredApp();
			const store = buildStoreWith(buildCluster({ id: 'one' }));
			render(
				<ClusterTray
					app = { app }
					settingsStore = { store }
					clusterId = 'one'
					onConfirmUnlink = { () => {} }
					onPair = { () => {} }
				/>
			);

			fireEvent.click(screen.getByRole('button', { name: 'Cluster options' }));
			const items = menus[0].menuItems__;
			items[1].onClick__?.(new MouseEvent('click'));
			openMembers.size = 0;

			expect([items.map((item) => item.title__), calls.closed]).toEqual([
				['Open cluster', 'Close cluster', 'Pair with…'],
				[[app, store, 'one']],
			]);
		});

		it('starts pairing the Cluster when Pair with… is chosen', () => {
			const onPair = vi.fn();
			const menus = captureMenus();
			render(
				<ClusterTray
					app = { createConfiguredApp() }
					settingsStore = { buildStoreWith(buildCluster({ id: 'one' })) }
					clusterId = 'one'
					onConfirmUnlink = { () => {} }
					onPair = { onPair }
				/>
			);

			fireEvent.click(screen.getByRole('button', { name: 'Cluster options' }));
			menus[0].menuItems__[1].onClick__?.(new MouseEvent('click'));

			expect(onPair).toHaveBeenCalledWith('one');
		});

		it('offers Unlink, not Pair with…, when the Cluster is paired', () => {
			const onConfirmUnlink = vi.fn();
			const menus = captureMenus();
			render(
				<ClusterTray
					app = { createConfiguredApp() }
					settingsStore = { buildStoreWith(buildCluster({ id: 'one', pairedWith: 'two' }), buildCluster({ id: 'two', pairedWith: 'one' })) }
					clusterId = 'one'
					onConfirmUnlink = { onConfirmUnlink }
					onPair = { () => {} }
				/>
			);

			fireEvent.click(screen.getByRole('button', { name: 'Cluster options' }));
			const items = menus[0].menuItems__;
			items[1].onClick__?.(new MouseEvent('click'));

			expect([items.map((item) => item.title__), onConfirmUnlink.mock.calls]).toEqual([['Open cluster', 'Unlink'], [['one']]]);
		});
	});
});