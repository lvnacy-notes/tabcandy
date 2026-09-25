import {
	afterEach,
	describe,
	expect,
	it,
} from 'vitest';
import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { App as ObsidianApp } from 'obsidian';
import { withEmptyPrivateRegistries } from '../fakes';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setLayoutReady,
} from '../FakeWorkspace';
import { createFakeLeaf, setDisplayText } from '../FakeWorkspaceLeaf';
import {
	getClosedTabs,
	registerTabTracking,
	resetTabTrackingState,
} from '../../services/tabNavigation';
import { normalizeSettings } from '../../settings/normalizeSettings';
import SettingsStore from '../../settings/SettingsStore';
import { TabCandyView } from '../../TabCandyView';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function buildApp(): ObsidianApp {
	return withEmptyPrivateRegistries(createFakeWorkspaceApp({ files: {} }));
}

async function open(view: TabCandyView): Promise<void> {
	await act(async () => {
		await view.onOpen();
	});
}

describe('RecentlyClosedTabs + real App: close, track, reopen', () => {
	afterEach(() => {
		resetTabTrackingState();
	});

	it('surfaces a closed tab in the rendered list, and reopens it into the hosting leaf on click', async () => {
		const app = buildApp();
		const note = createFakeLeaf(app);
		await note.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		setDisplayText(note, 'A');
		addRootLeaf(app, note);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		note.detach();
		app.workspace.trigger('layout-change');
		expect(getClosedTabs()).toHaveLength(1);

		const settingsStore = new SettingsStore(
			normalizeSettings({ showRecentlyClosedTabs: true }),
			async () => {}
		);
		const hostingLeaf = app.workspace.getLeaf(true);
		const view = new TabCandyView(settingsStore, hostingLeaf);
		await open(view);

		const entryButton = view.contentEl.querySelector(
			'.tabcandy-dashboard-fileicon[title="A"]'
		);
		expect(entryButton).not.toBeNull();

		fireEvent.click(entryButton as Element);
		// The click handler fires reopenClosedTab() without awaiting it -
		// same as the dashboard's other click handlers - so its two
		// sequential internal awaits (setViewState, then revealLeaf) need
		// flushing before the leaf's resulting state can be asserted on.
		await Promise.resolve();
		await Promise.resolve();

		expect(getClosedTabs()).toEqual([]);
		expect(hostingLeaf.getViewState()).toEqual({
			type: 'markdown',
			state: { file: 'A.md' },
			active: true,
		});
	});
});
