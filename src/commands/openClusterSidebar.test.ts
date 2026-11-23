/** @file Tests for the open-cluster-sidebar command. */
import { WorkspaceLeaf } from 'obsidian';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './openClusterSidebar';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import { CLUSTER_SIDEBAR_VIEW_TYPE } from '../types';

/**
 * Builds a stand-in leaf that records the view state it is given.
 *
 * @returns The leaf and its `setViewState` spy.
 */
function buildLeaf(): {
	leaf: WorkspaceLeaf;
	setViewState: ReturnType<typeof vi.fn>
} {
	const setViewState = vi.fn().mockResolvedValue(undefined);
	return {
		leaf: { setViewState } as unknown as WorkspaceLeaf,
		setViewState,
	};
}

describe('open-cluster-sidebar command', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('has its id and name', () => {
		const command = buildInvokeCommand(createFakeWorkspaceApp());

		expect([
			command.id,
			command.name
		]).toEqual([
			'open-cluster-sidebar',
			'Open cluster sidebar'
		]);
	});

	it('opens the sidebar in the right dock when it is not open', async () => {
		const app = createFakeWorkspaceApp();
		const {
			leaf,
			setViewState
		} = buildLeaf();
		vi.spyOn(
			app.workspace,
			'getLeavesOfType'
		).mockReturnValue([]);
		vi.spyOn(
			app.workspace,
			'getRightLeaf'
		).mockReturnValue(leaf);
		const reveal = vi.spyOn(
			app.workspace,
			'revealLeaf'
		).mockResolvedValue(undefined);

		buildInvokeCommand(app).callback?.();
		await vi.runAllTimersAsync();

		expect(reveal).toHaveBeenCalledWith(leaf);
		expect(setViewState).toHaveBeenCalledWith({
			type: CLUSTER_SIDEBAR_VIEW_TYPE,
			active: true,
		});
	});

	it('reveals the open sidebar instead of opening another', async () => {
		const app = createFakeWorkspaceApp();
		const { leaf } = buildLeaf();
		vi.spyOn(
			app.workspace,
			'getLeavesOfType'
		).mockReturnValue([leaf]);
		const getRightLeaf = vi.spyOn(
			app.workspace,
			'getRightLeaf'
		);
		const reveal = vi.spyOn(
			app.workspace,
			'revealLeaf'
		).mockResolvedValue(undefined);

		buildInvokeCommand(app).callback?.();
		await vi.runAllTimersAsync();

		expect(reveal).toHaveBeenCalledWith(leaf);
		expect(getRightLeaf).not.toHaveBeenCalled();
	});

	it('does nothing when the right dock has no leaf to offer', async () => {
		const app = createFakeWorkspaceApp();
		vi.spyOn(
			app.workspace,
			'getLeavesOfType'
		).mockReturnValue([]);
		vi.spyOn(
			app.workspace,
			'getRightLeaf'
		).mockReturnValue(null);
		const reveal = vi.spyOn(
			app.workspace,
			'revealLeaf'
		).mockResolvedValue(undefined);

		buildInvokeCommand(app).callback?.();
		await vi.runAllTimersAsync();

		expect(reveal).not.toHaveBeenCalled();
	});
});