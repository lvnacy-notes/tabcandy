/** @file Tests for the open-tab-candy command. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './openTabCandy';
import { createConfiguredApp } from '../test/fakes';
import { TAB_CANDY_VIEW_TYPE } from '../types';

describe('open-tab-candy command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(createConfiguredApp({ files: {} }));

		expect([command.id, command.name]).toEqual(['open-tab-candy', 'Open new tab']);
	});

	it('opens a Tab Candy leaf', async () => {
		const app = createConfiguredApp({ files: {} });

		buildInvokeCommand(app).callback?.();

		await vi.waitFor(() => {
			expect(app.workspace.getLeavesOfType(TAB_CANDY_VIEW_TYPE)).toHaveLength(1);
		});
	});
});