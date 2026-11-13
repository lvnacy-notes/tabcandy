/** @file Tests for the Cluster sidebar. */
import { App } from 'obsidian';
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
import ClusterSidebar from './clusterSidebar';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';

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
});