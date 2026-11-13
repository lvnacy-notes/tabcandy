/** @file Tests for replacing empty tabs with Tab Candy. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { createConfiguredApp } from '../test/fakes';
import { activateView } from './newTabHijack';
import { TAB_CANDY_VIEW_TYPE } from '../types';

describe('activateView', () => {
	it('creates a new leaf and points it at the Tab Candy view when none exists yet', async () => {
		const app = createConfiguredApp({ files: {} });

		await activateView(app);

		const leaves = app.workspace.getLeavesOfType(TAB_CANDY_VIEW_TYPE);
		expect(leaves).toHaveLength(1);
	});

	it('reveals the newly created leaf', async () => {
		const app = createConfiguredApp({ files: {} });
		const revealLeaf = vi.spyOn(app.workspace, 'revealLeaf');

		await activateView(app);

		expect(revealLeaf).toHaveBeenCalledTimes(1);
	});

	it('does not create a second Tab Candy leaf when one is already open', async () => {
		const app = createConfiguredApp({ files: {} });
		await activateView(app);

		await activateView(app);

		const leaves = app.workspace.getLeavesOfType(TAB_CANDY_VIEW_TYPE);
		expect(leaves).toHaveLength(1);
	});

	it('reveals the existing Tab Candy leaf when one is already open', async () => {
		const app = createConfiguredApp({ files: {} });
		await activateView(app);
		const revealLeaf = vi.spyOn(app.workspace, 'revealLeaf');

		await activateView(app);

		expect(revealLeaf).toHaveBeenCalledTimes(1);
	});

	it('leaves an unrelated leaf unchanged when creating the Tab Candy leaf', async () => {
		const app = createConfiguredApp({ files: { 'A.md': '' } });
		const otherLeaf = app.workspace.getLeaf(true);
		await otherLeaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			active: false,
		});

		await activateView(app);

		expect(otherLeaf.getViewState().type).toBe('markdown');
	});
});