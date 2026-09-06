import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { createConfiguredApp } from '../test/fakes';
import { activateView } from './newTabHijack';
import { TAB_CANDY_VIEW_TYPE } from '../TabCandyView';

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

	it('reuses an existing Tab Candy leaf rather than creating a second one', async () => {
		const app = createConfiguredApp({ files: {} });
		await activateView(app);

		await activateView(app);

		const leaves = app.workspace.getLeavesOfType(TAB_CANDY_VIEW_TYPE);
		expect(leaves).toHaveLength(1);
	});

	it('reveals the existing leaf on reuse rather than skipping activation entirely', async () => {
		const app = createConfiguredApp({ files: {} });
		await activateView(app);
		const revealLeaf = vi.spyOn(app.workspace, 'revealLeaf');

		await activateView(app);

		expect(revealLeaf).toHaveBeenCalledTimes(1);
	});

	it('does not disturb an unrelated existing leaf when creating the Tab Candy one', async () => {
		const app = createConfiguredApp({ files: {} });
		const otherLeaf = app.workspace.getLeaf(true);
		await otherLeaf.setViewState({ type: 'markdown', active: false });

		await activateView(app);

		expect(otherLeaf.getViewState().type).toBe('markdown');
	});
});