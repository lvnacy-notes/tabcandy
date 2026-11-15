/** @file Tests for the open-cluster-tray command. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './openClusterTray';
import {
	buildStore,
	buildStoreWith,
	isAvailable
} from '../test/clusterHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';
import { CLUSTER_TRAY_VIEW_TYPE, type PromptForClusterChoice } from '../types';

describe('open-cluster-tray command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(
			createConfiguredApp(),
			buildStore(),
			vi.fn()
		);

		expect([command.id, command.name]).toEqual(['open-cluster-tray', 'Open a cluster tray']);
	});

	it('is available when a Cluster exists', () => {
		const command = buildInvokeCommand(
			createConfiguredApp(),
			buildStoreWith(buildCluster()),
			vi.fn()
		);

		expect(isAvailable(command)).toBe(true);
	});

	it('is unavailable when there are no Clusters', () => {
		const command = buildInvokeCommand(
			createConfiguredApp(),
			buildStore(),
			vi.fn()
		);

		expect(isAvailable(command)).toBe(false);
	});

	it('asks which Cluster to open, then opens its Tray', async () => {
		const app = createConfiguredApp();
		const setViewState = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([]);
		vi.spyOn(app.workspace, 'getLeaf').mockReturnValue({ setViewState } as never);
		const prompt = vi.fn<PromptForClusterChoice>((_clusters, onSubmit) => onSubmit('cluster-a'));
		const command = buildInvokeCommand(
			app,
			buildStoreWith(buildCluster()),
			prompt
		);

		command.checkCallback?.(false);

		await vi.waitFor(() => {
			expect(setViewState).toHaveBeenCalledWith({
				type: CLUSTER_TRAY_VIEW_TYPE,
				active: true,
				state: { clusterId: 'cluster-a' },
			});
		});
		expect(prompt.mock.calls[0][2]).toEqual({ action: 'Open', title: 'Open a cluster tray' });
	});
});