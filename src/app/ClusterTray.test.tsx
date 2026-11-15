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
import ClusterTray from './ClusterTray';
import { buildStoreWith } from '../test/clusterHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';

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
			/>
		);

		fireEvent.click(screen.getByText('b'));

		expect(onOpenMember).toHaveBeenCalledWith('b.md');
	});
});