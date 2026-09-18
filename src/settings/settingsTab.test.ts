import {
	describe,
	expect,
	it
} from 'vitest';
import {
	SettingDefinitionGroup,
	SettingDefinitionList,
	SettingDefinitionPage,
} from 'obsidian';
import {
	buildSettings,
	createConfiguredApp,
	withEmptyPrivateRegistries,
} from '../test/fakes';
import SettingsStore from './SettingsStore';
import TabCandySettingTab from './SettingsTab';
import { BackgroundTheme, TabCandySettings } from '../types';
import TabCandyPlugin from '../../main';

/**
 * A minimal stand-in for TabCandyPlugin, narrowed to just the two members
 * SettingsTab.ts actually reads (`settings`, `settingsStore`) - the same
 * cast-through-`unknown` shape src/test/fakes.ts already uses for
 * narrowing Obsidian's own private-registry fixtures, rather than
 * constructing a real `Plugin` subclass (which needs a manifest, a real
 * plugin lifecycle, etc. that this file's assertions have no use for).
 */
function buildPlugin(settings: TabCandySettings): TabCandyPlugin {
	const settingsStore = new SettingsStore(settings, async () => {});
	return { settings, settingsStore } as unknown as TabCandyPlugin;
}

function buildTab(
	settings: TabCandySettings = buildSettings()
): TabCandySettingTab {
	// getSettingDefinitions() calls getBookmarkGroups(this.app) to build
	// the Bookmarks-group dropdown's options regardless of which page it
	// ends up nested under, which touches the same undocumented
	// internalPlugins registry commands.ts/bookmarks.ts's own tests
	// fixture via src/test/fakes.ts - not this file's concern to
	// re-verify (Testing Specification, "commands.ts/bookmarks.ts
	// private-registry fixtures"), just something this file's app needs
	// present-but-empty to avoid the strict-proxy's throw-on-unassigned-
	// access.
	const app = withEmptyPrivateRegistries(createConfiguredApp({ files: {} }));
	return new TabCandySettingTab(app, buildPlugin(settings));
}

describe('getSettingDefinitions', () => {
	it('returns exactly two top-level entries, both pages, named Function and Design', () => {
		const tab = buildTab();

		const definitions = tab.getSettingDefinitions();

		expect(definitions).toHaveLength(2);
		expect(definitions.every((def) => 'type' in def && def.type === 'page')).toBe(true);
		expect(definitions.map((def) => (def as SettingDefinitionPage).name)).toEqual([
			'Function',
			'Design',
		]);
	});

	it('relocates New tab behavior, Search, Time, Greeting, Recent files, Bookmark, and Quote settings under Function', () => {
		const tab = buildTab();

		const [functionPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];

		const headings = (functionPage.items ?? []).map(
			(item) => (item as SettingDefinitionGroup).heading
		);
		expect(headings).toEqual([
			'New tab behavior',
			'Search settings',
			'Time settings',
			'Greeting settings',
			'Recent file settings',
			'Bookmark settings',
			'Quote settings',
		]);
	});

	it('relocates Background settings and Local background images under Design, unchanged', () => {
		const tab = buildTab();

		const [, designPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];

		const items = designPage.items ?? [];
		expect(items).toHaveLength(4);
		expect((items[0] as SettingDefinitionGroup).heading).toBe(
			'Background settings'
		);
		expect((items[1] as SettingDefinitionGroup).heading).toBe('');
		expect((items[2] as SettingDefinitionList).type).toBe('list');
		expect((items[2] as SettingDefinitionList).heading).toBe(
			'Local background images'
		);
		expect((items[3] as SettingDefinitionGroup).heading).toBe(
			'Style customization'
		);
	});

	it('does not change any relocated item\'s control binding', () => {
		const tab = buildTab();

		const [functionPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];
		const newTabBehaviorGroup = (functionPage.items ?? [])[0] as SettingDefinitionGroup<keyof TabCandySettings>;
		const toggleItem = (newTabBehaviorGroup.items ?? [])[0] as { control?: { key?: string } };

		expect(toggleItem.control?.key).toBe('replaceEmptyTabsWithTabCandy');
	});

	describe("Design page's status badge", () => {
		it('is null when the background theme is not Local', () => {
			const tab = buildTab(
				buildSettings({
					backgroundTheme: BackgroundTheme.CUSTOM,
					manualBackgroundFiles: ['Backgrounds/missing.png'],
				})
			);

			const [, designPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];
			const status = designPage.status as () => 'warning' | null;

			expect(status()).toBeNull();
		});

		it('is null when the Local theme has no missing manual or synced files', () => {
			const tab = buildTab(
				buildSettings({
					backgroundTheme: BackgroundTheme.LOCAL,
					manualBackgroundFiles: [],
					backgroundFiles: [],
				})
			);

			const [, designPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];
			const status = designPage.status as () => 'warning' | null;

			expect(status()).toBeNull();
		});

		it('is a warning when the Local theme references a manual background file that no longer resolves', () => {
			const tab = buildTab(
				buildSettings({
					backgroundTheme: BackgroundTheme.LOCAL,
					manualBackgroundFiles: ['Backgrounds/deleted.png'],
					backgroundFiles: [],
				})
			);

			const [, designPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];
			const status = designPage.status as () => 'warning' | null;

			expect(status()).toBe('warning');
		});

		it('is a warning when the Local theme references a synced background file that no longer resolves', () => {
			const tab = buildTab(
				buildSettings({
					backgroundTheme: BackgroundTheme.LOCAL,
					manualBackgroundFiles: [],
					backgroundFiles: ['Backgrounds/deleted.png'],
				})
			);

			const [, designPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];
			const status = designPage.status as () => 'warning' | null;

			expect(status()).toBe('warning');
		});
	});

	describe('Auto-contrast overlay text toggle', () => {
		function getToggleItem(
			settings: TabCandySettings
		): { visible?: () => boolean; control?: { key?: string } } {
			const tab = buildTab(settings);
			const [, designPage] = tab.getSettingDefinitions() as SettingDefinitionPage<keyof TabCandySettings>[];
			const styleGroup = (designPage.items ?? [])[3] as SettingDefinitionGroup<keyof TabCandySettings>;
			return (styleGroup.items ?? [])[0] as {
				visible?: () => boolean;
				control?: { key?: string };
			};
		}

		it('is bound to the autoContrastOverlayText setting', () => {
			const toggleItem = getToggleItem(buildSettings());

			expect(toggleItem.control?.key).toBe('autoContrastOverlayText');
		});

		it('is visible when the background theme is Custom', () => {
			const toggleItem = getToggleItem(
				buildSettings({ backgroundTheme: BackgroundTheme.CUSTOM })
			);

			expect(toggleItem.visible?.()).toBe(true);
		});

		it('is visible when the background theme is Local', () => {
			const toggleItem = getToggleItem(
				buildSettings({ backgroundTheme: BackgroundTheme.LOCAL })
			);

			expect(toggleItem.visible?.()).toBe(true);
		});

		it('is hidden for the transparent themes, where there is no background to contrast against', () => {
			const toggleItem = getToggleItem(
				buildSettings({ backgroundTheme: BackgroundTheme.TRANSPARENT })
			);

			expect(toggleItem.visible?.()).toBe(false);
		});
	});
});