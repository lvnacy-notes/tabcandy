/** @file Tests for the sidebar's actions. */
import {
	describe,
	expect,
	it
} from 'vitest';
import { buildSidebarHandlers } from './sidebarHandlers';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	buildStoreWith,
	cancelling,
	confirming,
	confirmingNothing,
	submitting
} from '../test/clusterHelpers';
import { buildDependencies } from '../test/dependencyHelpers';
import { buildCluster } from '../test/fakes';

describe('buildSidebarHandlers', () => {
	it('creates an empty Cluster from the submitted details', async () => {
		const store = buildStoreWith();
		const handlers = buildSidebarHandlers(buildDependencies(
			createFakeWorkspaceApp(),
			store,
			{ promptForCluster: submitting({ name: 'New' }).prompt }
		));

		handlers.onCreateCluster();
		await Promise.resolve();

		expect(Object.values(store.get().clusters).map((cluster) => cluster.name)).toEqual(['New']);
	});

	it('asks for the details when editing', () => {
		const {
			prompt,
			spy
		} = cancelling();
		const handlers = buildSidebarHandlers(buildDependencies(
			createFakeWorkspaceApp(),
			buildStoreWith(buildCluster({ id: 'one' })),
			{ promptForCluster: prompt }
		));

		handlers.onEditCluster('one');

		expect(spy).toHaveBeenCalledTimes(1);
	});

	it('deletes a Cluster once confirmed', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		const handlers = buildSidebarHandlers(buildDependencies(
			createFakeWorkspaceApp(),
			store,
			{ promptForConfirmation: confirming().prompt }
		));

		handlers.onDeleteCluster('one');
		await Promise.resolve();

		expect(store.get().clusters['one']).toBeUndefined();
	});

	it('asks for nothing when unlinking an unknown Cluster', () => {
		const {
			prompt,
			spy
		} = confirmingNothing();
		const handlers = buildSidebarHandlers(buildDependencies(
			createFakeWorkspaceApp(),
			buildStoreWith(),
			{ promptForConfirmation: prompt }
		));

		handlers.onConfirmUnlink('missing');

		expect(spy).not.toHaveBeenCalled();
	});
});
