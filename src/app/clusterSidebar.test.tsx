/** @file Tests for the Cluster sidebar. */
import { App, Menu } from 'obsidian';
import { Menu as MenuMock } from 'obsidian-test-mocks/obsidian';
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
import ClusterSidebar from './ClusterSidebar';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildDataTransfer, setDragManager } from '../test/dragHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';

const opened = vi.hoisted((): unknown[][] => []);
const openedTrays = vi.hoisted((): unknown[][] => []);
const openedTraysAt = vi.hoisted((): unknown[][] => []);

vi.mock('../obsidian/trayLeaves', () => ({
	openClusterTray: (...args: unknown[]) => {
		openedTrays.push(args);
	},
	openClusterTrayAt: (...args: unknown[]) => {
		openedTraysAt.push(args);
	},
}));

vi.mock('../ui/ResolveMissingModal', () => ({
	default: class {
		constructor(...args: unknown[]) {
			opened.push(args);
		}

		open(): void {}
	},
}));

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(cleanup);

/**
 * Renders the sidebar.
 *
 * @param app - The fake app.
 * @param store - The store.
 * @param onCreateCluster - Called when the create button is clicked.
 * @returns The render result.
 */
function renderSidebar(
	app: App,
	store: SettingsStore,
	onCreateCluster: () => void = () => {}
): ReturnType<typeof render> {
	return render(
		<ClusterSidebar
			app = { app }
			settingsStore = { store }
			onCreateCluster = { onCreateCluster }
		/>
	);
}

describe('ClusterSidebar', () => {
	it('says there are no Clusters when there are none', () => {
		renderSidebar(createConfiguredApp(), buildStoreWith());

		expect(screen.getByText('No clusters yet.')).toBeTruthy();
	});

	it('lists every Cluster by name', () => {
		renderSidebar(
			createConfiguredApp(),
			buildStoreWith(
				buildCluster({ id: 'one', name: 'First' }),
				buildCluster({ id: 'two', name: 'Second' })
			)
		);

		expect([screen.getByText('First'), screen.getByText('Second')].length).toBe(2);
	});

	it('starts with every Cluster collapsed', () => {
		renderSidebar(
			createConfiguredApp({ files: { 'a.md': '' } }),
			buildStoreWith(buildCluster({ members: ['a.md'] }))
		);

		expect(screen.queryByText('a')).toBeNull();
	});

	it('expands a Cluster when its row is clicked', () => {
		renderSidebar(
			createConfiguredApp({ files: { 'a.md': '' } }),
			buildStoreWith(buildCluster({ members: ['a.md'] }))
		);

		fireEvent.click(screen.getByText('Cluster A'));

		expect(screen.getByText('a')).toBeTruthy();
	});

	it('collapses an expanded Cluster when its row is clicked again', () => {
		renderSidebar(
			createConfiguredApp({ files: { 'a.md': '' } }),
			buildStoreWith(buildCluster({ members: ['a.md'] }))
		);
		fireEvent.click(screen.getByText('Cluster A'));

		fireEvent.click(screen.getByText('Cluster A'));

		expect(screen.queryByText('a')).toBeNull();
	});

	it('expands Clusters independently', () => {
		renderSidebar(
			createConfiguredApp({ files: { 'a.md': '', 'b.md': '' } }),
			buildStoreWith(
				buildCluster({ id: 'one', name: 'First', members: ['a.md'] }),
				buildCluster({ id: 'two', name: 'Second', members: ['b.md'] })
			)
		);

		fireEvent.click(screen.getByText('First'));

		expect([screen.queryByText('a') !== null, screen.queryByText('b') !== null]).toEqual([true, false]);
	});

	it('starts creating a Cluster when the plus button is clicked', () => {
		const onCreateCluster = vi.fn();
		renderSidebar(
			createConfiguredApp(),
			buildStoreWith(),
			onCreateCluster
		);

		fireEvent.click(screen.getByLabelText('Create cluster'));

		expect(onCreateCluster).toHaveBeenCalledTimes(1);
	});

	it('marks a member whose file is missing', () => {
		const { container } = renderSidebar(
			createConfiguredApp(),
			buildStoreWith(buildCluster({ members: ['gone.md'] }))
		);

		fireEvent.click(screen.getByText('Cluster A'));

		expect(container.querySelector('.is-unresolved')).not.toBeNull();
	});

	it('stops marking a member once its file is created', async () => {
		const app = createConfiguredApp();
		const { container } = renderSidebar(app, buildStoreWith(buildCluster({ members: ['a.md'] })));
		fireEvent.click(screen.getByText('Cluster A'));

		await act(async () => {
			await app.vault.create('a.md', '');
		});

		expect(container.querySelector('.is-unresolved')).toBeNull();
	});

	it('opens a member in the active pane', () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const leaf = app.workspace.getLeaf(true);
		const openFile = vi.spyOn(leaf, 'openFile').mockResolvedValue();
		vi.spyOn(app.workspace, 'getLeaf').mockReturnValue(leaf);
		renderSidebar(app, buildStoreWith(buildCluster({ members: ['a.md'] })));
		fireEvent.click(screen.getByText('Cluster A'));

		act(() => {
			fireEvent.click(screen.getByText('a'));
		});

		expect(openFile).toHaveBeenCalledTimes(1);
	});

	it('opens nothing when a missing member is clicked', () => {
		const app = createConfiguredApp();
		const getLeaf = vi.spyOn(app.workspace, 'getLeaf');
		renderSidebar(app, buildStoreWith(buildCluster({ members: ['gone.md'] })));
		fireEvent.click(screen.getByText('Cluster A'));

		act(() => {
			fireEvent.click(screen.getByText('gone'));
		});

		expect(getLeaf).not.toHaveBeenCalled();
	});

	it('removes a member from its Cluster', () => {
		const store = buildStoreWith(buildCluster({ members: ['a.md', 'b.md'] }));
		renderSidebar(createConfiguredApp({ files: { 'a.md': '', 'b.md': '' } }), store);
		fireEvent.click(screen.getByText('Cluster A'));

		act(() => {
			fireEvent.click(screen.getAllByLabelText('Remove from cluster')[0]);
		});

		expect(store.get().clusters['cluster-a'].members).toEqual(['b.md']);
	});

	it('drops the removed member from the list', async () => {
		const store = buildStoreWith(buildCluster({ members: ['a.md', 'b.md'] }));
		renderSidebar(createConfiguredApp({ files: { 'a.md': '', 'b.md': '' } }), store);
		fireEvent.click(screen.getByText('Cluster A'));

		fireEvent.click(screen.getAllByLabelText('Remove from cluster')[0]);

		await waitFor(() => {
			expect(screen.queryByText('a')).toBeNull();
		});
	});

	it('shows a Cluster added after it first rendered', async () => {
		const store = buildStoreWith();
		renderSidebar(createConfiguredApp(), store);

		await act(async () => {
			await store.update({ clusters: buildStoreWith(buildCluster({ name: 'Later' })).get().clusters });
		});

		expect(screen.getByText('Later')).toBeTruthy();
	});

	it('reorders members when a row is dropped on another', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one', members: ['a.md', 'b.md', 'c.md'] }));
		const app = createConfiguredApp({ files: { 'a.md': '', 'b.md': '', 'c.md': '' } });
		setDragManager(app, {});
		renderSidebar(app, store);
		fireEvent.click(screen.getByText('Cluster A'));
		const dataTransfer = buildDataTransfer();
		const rows = document.querySelectorAll('.tabcandy-member-row');

		fireEvent.dragStart(rows[0], { dataTransfer });
		fireEvent.drop(rows[2], { dataTransfer });

		await waitFor(() => {
			expect(store.get().clusters['one'].members).toEqual(['b.md', 'c.md', 'a.md']);
		});
	});

	it('adds a dropped file to the Cluster it is dropped on', async () => {
		const app = createConfiguredApp({ files: { 'a.md': '', 'x.md': '' } });
		const file = app.vault.getAbstractFileByPath('x.md');
		setDragManager(app, { draggable: { file } });
		const store = buildStoreWith(buildCluster({ id: 'one', members: ['a.md'] }));
		renderSidebar(app, store);

		fireEvent.drop(screen.getByText('Cluster A'), { dataTransfer: buildDataTransfer() });

		await waitFor(() => {
			expect(store.get().clusters['one'].members).toEqual(['a.md', 'x.md']);
		});
	});

	it('opens the resolve modal for the Cluster when its drawer has missing members', () => {
		opened.length = 0;
		const store = buildStoreWith(buildCluster({ id: 'one', members: ['gone.md'] }));
		const app = createConfiguredApp();
		renderSidebar(app, store);
		fireEvent.click(screen.getByText('Cluster A'));

		fireEvent.click(screen.getByRole('button', { name: 'Resolve missing (1)' }));

		expect(opened).toEqual([[app, store, 'one', undefined]]);
	});

	it('opens the Cluster\'s Tray from its context menu', () => {
		openedTrays.length = 0;
		const menus: MenuMock[] = [];
		vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockImplementation(function (this: Menu) {
			menus.push(this as unknown as MenuMock);
			return this;
		});
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		const app = createConfiguredApp();
		renderSidebar(app, store);

		fireEvent.contextMenu(screen.getByText('Cluster A'));
		menus[0].menuItems__[0].onClick__?.(new MouseEvent('click'));

		expect(openedTrays).toEqual([[app, store, 'one']]);
	});

	it('opens the Cluster\'s Tray where its heading is dropped', () => {
		openedTraysAt.length = 0;
		const target = createDiv();
		Object.defineProperty(document, 'elementFromPoint', { value: () => target, configurable: true });
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		const app = createConfiguredApp();
		renderSidebar(app, store);

		fireEvent.dragEnd(screen.getByRole('button', { name: /Cluster A/ }), {
			clientX: 5,
			clientY: 6,
			dataTransfer: buildDataTransfer(),
		});
		Reflect.deleteProperty(document, 'elementFromPoint');

		expect(openedTraysAt).toEqual([[app, store, 'one', target]]);
	});
});