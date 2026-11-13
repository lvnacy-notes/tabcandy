/** @file Integration tests for closing, tracking and reopening tabs through the dashboard. */
import { App as ObsidianApp } from 'obsidian';
import { act } from 'react';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { fireEvent } from '@testing-library/react';
import { withEmptyPrivateRegistries } from '../fakes';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setLayoutReady,
} from '../FakeWorkspace';
import { createFakeLeaf, setDisplayText } from '../FakeWorkspaceLeaf';
import { TabCandyView } from '../../obsidian/TabCandyView';
import {
	getClosedTabs,
	registerTabTracking,
	resetTabTrackingState,
} from '../../tabs/tabNavigation';
import { normalizeSettings } from '../../settings/normalizeSettings';
import SettingsStore from '../../settings/SettingsStore';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Builds a fake app whose vault holds `A.md`.
 *
 * @returns The app.
 */
function buildApp(): ObsidianApp {
	return withEmptyPrivateRegistries(createFakeWorkspaceApp({ files: { 'A.md': '' } }));
}

/**
 * Opens a view inside `act()`.
 *
 * @param view - The view.
 */
async function open(view: TabCandyView): Promise<void> {
	await act(async () => {
		await view.onOpen();
	});
}

describe('RecentlyClosedTabs + real App: close, track, reopen', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
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
		await vi.runOnlyPendingTimersAsync();

		expect(getClosedTabs()).toEqual([]);
		expect(hostingLeaf.getViewState()).toEqual({
			type: 'markdown',
			state: { file: 'A.md' },
			active: true,
		});
	});

	it('with dashboardFocusesOpenTab on, switches to an already-open copy instead of reopening, removes the entry, and leaves the Tab Candy leaf untouched', async () => {
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

		const alreadyOpen = createFakeLeaf(app);
		await alreadyOpen.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, alreadyOpen);

		const settingsStore = new SettingsStore(
			normalizeSettings({
				showRecentlyClosedTabs: true,
				dashboardFocusesOpenTab: true,
			}),
			async () => {}
		);
		const hostingLeaf = app.workspace.getLeaf(true);
		const view = new TabCandyView(settingsStore, hostingLeaf);
		await open(view);

		const entryButton = view.contentEl.querySelector(
			'.tabcandy-dashboard-fileicon[title="A"]'
		);
		expect(entryButton).not.toBeNull();
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		fireEvent.click(entryButton as Element);

		expect(setActiveLeaf).toHaveBeenCalledWith(alreadyOpen, { focus: true });
		expect(getClosedTabs()).toEqual([]);
		expect(hostingLeaf.getViewState()).toEqual({ type: 'empty', state: {} });
	});

	it('with dashboardFocusesOpenTab on but no already-open copy, falls back to reopening normally', async () => {
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
			normalizeSettings({
				showRecentlyClosedTabs: true,
				dashboardFocusesOpenTab: true,
			}),
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
		await vi.runOnlyPendingTimersAsync();

		expect(getClosedTabs()).toEqual([]);
		expect(hostingLeaf.getViewState()).toEqual({
			type: 'markdown',
			state: { file: 'A.md' },
			active: true,
		});
	});
});