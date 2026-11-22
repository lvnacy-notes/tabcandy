/** @file Tests for the open-recent-cluster-tray command. */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './openRecentClusterTray';
import { buildStoreWith, isAvailable } from '../test/clusterHelpers';
import {
	buildCluster,
	buildStore,
	createConfiguredApp
} from '../test/fakes';
import { CLUSTER_TRAY_VIEW_TYPE } from '../types';

describe('open-recent-cluster-tray command', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('has its id and name', () => {
		const command = buildInvokeCommand(createConfiguredApp(), buildStore());

		expect([command.id, command.name]).toEqual(['open-recent-cluster-tray', 'Open recent cluster tray']);
	});

	it('is unavailable when there are no Clusters', () => {
		const command = buildInvokeCommand(createConfiguredApp(), buildStore());

		expect(isAvailable(command)).toBe(false);
	});

	it('opens the Tray of the Cluster with the highest lastTouchedAt', async () => {
		const app = createConfiguredApp();
		const setViewState = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(app.workspace, 'getLeavesOfType').mockReturnValue([]);
		vi.spyOn(app.workspace, 'getLeaf').mockReturnValue({ setViewState } as never);
		const command = buildInvokeCommand(
			app,
			buildStoreWith(
				buildCluster({ id: 'old', lastTouchedAt: 1 }),
				buildCluster({ id: 'new', lastTouchedAt: 2 })
			)
		);

		expect(isAvailable(command)).toBe(true);
		command.checkCallback?.(false);
		await vi.runAllTimersAsync();

		expect(setViewState).toHaveBeenCalledWith({
			type: CLUSTER_TRAY_VIEW_TYPE,
			active: true,
			state: { clusterId: 'new' },
		});
	});
});