import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
	SettingGroup,
} from 'obsidian';
import TabCandyPlugin from '../../main';
import {
	filterExistingFiles,
	getBackgroundResourcePath,
	syncBackgroundsFolder,
} from '../newtab/backgrounds';
import { getBookmarkGroups } from '../newtab/bookmarks';
import { syncQuotesFile } from '../newtab/quotes';
import ChooseSearchProvider from '../ui/modals/ChooseSearchProvider';
import CustomQuotesModal from '../ui/modals/CustomQuotesModal';
import ChooseImageSuggestModal from '../ui/modals/ChooseImageSuggestModal';
import debounce from '../utils/debounce';
import {
	BACKGROUND_IMAGE_EXTENSIONS,
	BOOKMARK_SOURCE,
	BackgroundTheme,
	CustomQuote,
	TIME_FORMAT,
	TabCandySettings,
} from '../types';

/**
 * Uppercases the first character of a string.
 *
 * @param string - Text to capitalize.
 * @returns The text with its first character uppercased.
 */
const capitalizeFirstLetter = (string: string) =>
	string.charAt(0).toUpperCase() + string.slice(1);

/** Settings that commit on every keystroke, so their writes are debounced. */
const DEBOUNCED_SETTING_KEYS: ReadonlySet<keyof TabCandySettings> = new Set([
	'greetingText',
]);

/** Tab Candy's settings tab, split into Function and Design pages. */
export default class TabCandySettingTab extends PluginSettingTab {
	plugin: TabCandyPlugin;

	/** Created once so debounced keystrokes share one timer across re-renders. */
	private readonly debouncedUpdateSettings: (
		patch: Partial<TabCandySettings>
	) => void;

	/**
	 * @param app - The Obsidian app instance.
	 * @param plugin - The owning plugin, used to reach the settings store.
	 */
	constructor(app: App, plugin: TabCandyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.debouncedUpdateSettings = debounce(
			(patch: Partial<TabCandySettings>) => {
				void this.updateSettings(patch);
			},
			500
		);
	}

	/**
	 * Applies a settings patch through the store and optionally re-renders.
	 * A failed save is logged and surfaced as a Notice, and no re-render
	 * happens.
	 *
	 * @param patch - Settings fields to change.
	 * @param options - `redraw: true` re-renders the tab after a successful save.
	 */
	private async updateSettings(
		patch: Partial<TabCandySettings>,
		options: { redraw?: boolean } = {}
	): Promise<void> {
		try {
			await this.plugin.settingsStore.update(patch);
		} catch (error) {
			console.error('Tab Candy: failed to save settings', error);
			new Notice('Tab Candy: failed to save your settings. Please try again.');
			return;
		}
		if (options.redraw) {
			this.update();
		}
	}

	/**
	 * Reads a control's value from the settings store.
	 *
	 * @param key - The settings field the control is bound to.
	 * @returns The field's current value.
	 */
	getControlValue(
		key: keyof TabCandySettings
	): TabCandySettings[keyof TabCandySettings] {
		return this.plugin.settingsStore.get()[key];
	}

	/**
	 * Writes a control's value through the store, so subscribers (the live
	 * view) are notified. Debounced keys are written after a pause; all
	 * others save immediately and re-render the tab.
	 *
	 * Controls here are only toggles, dropdowns, text and file/folder
	 * pickers, so `value` is a boolean or string. Array and object fields
	 * are written through `updateSettings()` by their modals instead.
	 *
	 * @param key - The settings field the control is bound to.
	 * @param value - The new value.
	 */
	setControlValue(
		key: keyof TabCandySettings,
		value: boolean | string
	): void | Promise<void> {
		const patch = { [key]: value } as Partial<TabCandySettings>;

		if (DEBOUNCED_SETTING_KEYS.has(key)) {
			this.debouncedUpdateSettings(patch);
			return;
		}
		return this.updateSettings(patch, { redraw: true });
	}

	/**
	 * Computes the Design page's status badge.
	 *
	 * @param existingManualBackgroundFiles - Manual picks that still exist in the vault.
	 * @param existingBackgroundFiles - Synced files that still exist in the vault.
	 * @returns `'warning'` when the LOCAL theme is active and a recorded file
	 *   is missing; otherwise `null`.
	 */
	private getDesignPageStatus(
		existingManualBackgroundFiles: string[],
		existingBackgroundFiles: string[]
	): 'warning' | null {
		if (this.plugin.settings.backgroundTheme !== BackgroundTheme.LOCAL) {
			return null;
		}

		const hasMissingManualFile =
			existingManualBackgroundFiles.length <
			this.plugin.settings.manualBackgroundFiles.length;
		const hasMissingSyncedFile =
			existingBackgroundFiles.length <
			this.plugin.settings.backgroundFiles.length;

		return hasMissingManualFile || hasMissingSyncedFile
			? 'warning'
			: null;
	}

	/**
	 * Builds the declarative definitions for the Function and Design pages.
	 * Re-run on every render.
	 *
	 * @returns The two settings pages.
	 */
	getSettingDefinitions(): SettingDefinitionItem<
		keyof TabCandySettings
	>[] {
		/**
		 * Display-only filter: hides recorded files that no longer exist.
		 * Persisted pruning happens on load and on vault events.
		 */
		const existingManualBackgroundFiles = filterExistingFiles(
			this.app,
			this.plugin.settings.manualBackgroundFiles
		);
		const existingBackgroundFiles = filterExistingFiles(
			this.app,
			this.plugin.settings.backgroundFiles
		);

		const functionGroups: SettingDefinitionItem<keyof TabCandySettings>[] = [
			{
				type: 'group',
				heading: 'New tab behavior',
				items: [
					{
						name: 'Replace new empty tabs',
						desc: `Automatically show Tab Candy whenever an empty new tab is opened. Turn this off to only open Tab Candy on demand, via the "open new tab" command.`,
						control: {
							type: 'toggle',
							key: 'replaceEmptyTabsWithTabCandy',
						},
					},
					{
						name: 'Switch to notes that are already open',
						desc: "When you click a note in the recent files, bookmarks, or recently closed tabs lists and it's already open in another tab, switch to that tab instead of opening it in this one.",
						control: {
							type: 'toggle',
							key: 'dashboardFocusesOpenTab',
						},
					},
				],
			},
		];

		const designGroups: SettingDefinitionItem<keyof TabCandySettings>[] = [
			{
				type: 'group',
				heading: 'Background settings',
				items: [
					{
						name: 'Background theme',
						desc: `What theme would you like to utilize for the random backgrounds? Custom will allow you to input your own URL. Local will use the local images imported below.`,
						control: {
							type: 'dropdown',
							key: 'backgroundTheme',
							options: Object.fromEntries(
								Object.values(BackgroundTheme).map((theme) => [
									theme,
									capitalizeFirstLetter(theme),
								])
							),
						},
					},
					{
						name: 'Custom background image',
						desc: `A single image from your vault to use as the background.`,
						visible: () =>
							this.plugin.settings.backgroundTheme ===
							BackgroundTheme.CUSTOM,
						control: {
							type: 'file',
							key: 'customBackground',
							placeholder: 'E.g. Assets/background.png',
							filter: (file) =>
								BACKGROUND_IMAGE_EXTENSIONS.includes(
									file.extension.toLowerCase()
								),
						},
					},
					{
						name: 'Local background images folder',
						desc: `A folder inside your vault to sync background images from (not including subfolders). Supports JPG/JPEG/PNG/webp/GIF. Works on desktop and mobile.`,
						control: {
							type: 'folder',
							key: 'backgroundsFolder',
							placeholder: 'E.g. Assets/Tab Candy',
							includeRoot: true,
						},
					},
					{
						name: 'Sync now',
						desc: 'Re-scan the folder above and refresh the local backgrounds list',
						action: () => {
							void (async () => {
								await syncBackgroundsFolder(
									this.app,
									this.plugin.settingsStore
								);
								this.update();
							})();
						},
					},
				],
			},
			{
				type: 'group',
				heading: '',
				visible: () => existingBackgroundFiles.length > 0,
				items: existingBackgroundFiles.map((filePath) => ({
					name: '',
					render: (setting: Setting, group: SettingGroup) => {
						/** Rows share one `group.listEl`; tag it so they lay out as a grid. */
						group.listEl.addClass(
							'tabcandy-settings-localbackgrounds-grid'
						);
						setting.settingEl.addClass(
							'tabcandy-settings-localbackgrounds-background'
						);
						setting.controlEl.createEl('img', {
							cls: 'tabcandy-settings-localbackgrounds-background-image',
							attr: {
								src: getBackgroundResourcePath(this.app, filePath),
								title: filePath,
							},
						});
					},
				})),
			},
			{
				type: 'list',
				heading: 'Local background images',
				addItem: {
					name: 'Add vault image',
					action: () => {
						/** A modal rather than a `file` control: this appends to an array. */
						new ChooseImageSuggestModal(this.app, (result) => {
							if (
								this.plugin.settings.manualBackgroundFiles.includes(
									result.path
								)
							) {
								return;
							}
							void this.updateSettings(
								{
									manualBackgroundFiles: [
										...this.plugin.settings
											.manualBackgroundFiles,
										result.path,
									],
								},
								{ redraw: true }
							);
						}).open();
					},
				},
				onDelete: (index) => {
					/** `index` refers to the filtered list, not the raw setting. */
					const filePath = existingManualBackgroundFiles[index];
					if (!filePath) {return;}
					void this.updateSettings(
						{
							manualBackgroundFiles:
								this.plugin.settings.manualBackgroundFiles.filter(
									(path) => path !== filePath
								),
						},
						{ redraw: true }
					);
				},
				items: existingManualBackgroundFiles.map((filePath) => ({
					name: '',
					render: (setting: Setting, group: SettingGroup) => {
						/** Same grid layout as the synced-folder group above. */
						group.listEl.addClass(
							'tabcandy-settings-localbackgrounds-grid'
						);
						setting.settingEl.addClass(
							'tabcandy-settings-localbackgrounds-background'
						);
						setting.controlEl.createEl('img', {
							cls: 'tabcandy-settings-localbackgrounds-background-image',
							attr: {
								src: getBackgroundResourcePath(this.app, filePath),
								title: filePath,
							},
						});
					},
				})),
			},
			{
				type: 'group',
				heading: 'Style customization',
				items: [
					{
						name: 'Auto-contrast overlay text',
						desc: 'Extracts the active background image\'s own dominant color and uses a contrast-adjusted version of it for the overlay text, instead of a fixed neutral tone.',
						visible: () =>
							this.plugin.settings.backgroundTheme === BackgroundTheme.CUSTOM ||
							this.plugin.settings.backgroundTheme === BackgroundTheme.LOCAL,
						control: {
							type: 'toggle',
							key: 'autoContrastOverlayText',
						},
					},
				],
			},
		];

		functionGroups.push(
			{
				type: 'group',
				heading: 'Search settings',
				items: [
					{
						name: 'Show top left search button',
						desc: `Should the search button at the top left of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showTopLeftSearchButton',
						},
					},
					{
						name: 'Top left search provider',
						desc: `Which plugin should be utilized for search when clicking the top left button? Currently: ${this.plugin.settings.topLeftSearchProvider.display}`,
						action: () => {
							new ChooseSearchProvider(
								this.app,
								this.plugin.settings,
								(result) => {
									void this.updateSettings(
										{ topLeftSearchProvider: result },
										{ redraw: true }
									);
								}
							).open();
						},
					},
					{
						name: 'Show inline search',
						desc: `Should the inline search in the middle of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showInlineSearch',
						},
					},
					{
						name: 'Inline search provider',
						desc: `Which plugin should be utilized for search when clicking the middle of the screen button? Currently: ${this.plugin.settings.inlineSearchProvider.display}`,
						action: () => {
							new ChooseSearchProvider(
								this.app,
								this.plugin.settings,
								(result) => {
									void this.updateSettings(
										{ inlineSearchProvider: result },
										{ redraw: true }
									);
								}
							).open();
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Time settings',
				items: [
					{
						name: 'Show time',
						desc: `Should the time in the middle of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showTime',
						},
					},
					{
						name: 'Time format',
						desc: `Should the time be in 12-hour format or 24-hour format?`,
						control: {
							type: 'dropdown',
							key: 'timeFormat',
							options: {
								[TIME_FORMAT.TWELVE_HOUR]: TIME_FORMAT.TWELVE_HOUR,
								[TIME_FORMAT.TWENTY_FOUR_HOUR]:
									TIME_FORMAT.TWENTY_FOUR_HOUR,
							},
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Greeting settings',
				items: [
					{
						name: 'Show greeting',
						desc: `Should the greeting in the middle of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showGreeting',
						},
					},
					{
						name: 'Greeting text',
						desc: `What text should be displayed as a greeting? You can use the {{greeting}} to add a greeting based on the time of the day. (E.g. Good morning)`,
						control: {
							type: 'text',
							key: 'greetingText',
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Recent file settings',
				items: [
					{
						name: 'Show recent files',
						desc: `Should recent files in the middle of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showRecentFiles',
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Bookmark settings',
				items: [
					{
						name: 'Show bookmarks',
						desc: `Should bookmarks in the middle of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showBookmarks',
						},
					},
					{
						name: 'Bookmarks source',
						desc: `Should all bookmarks be displayed or bookmarks from a specific group?`,
						control: {
							type: 'dropdown',
							key: 'bookmarkSource',
							options: {
								[BOOKMARK_SOURCE.ALL]: 'All bookmarks',
								[BOOKMARK_SOURCE.GROUP]: 'Bookmarks from group',
							},
						},
					},
					{
						name: 'Bookmarks group',
						desc: `Which group should bookmarks be pulled from?`,
						visible: () =>
							this.plugin.settings.bookmarkSource ===
							BOOKMARK_SOURCE.GROUP,
						control: {
							type: 'dropdown',
							key: 'bookmarkGroup',
							options: Object.fromEntries(
								getBookmarkGroups(this.app).map((group) => [
									group.title,
									group.path,
								])
							),
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Recently closed tabs settings',
				items: [
					{
						name: 'Show recently closed tabs',
						desc: `Should recently closed tabs in the middle of the new tab screen be displayed?`,
						control: {
							type: 'toggle',
							key: 'showRecentlyClosedTabs',
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Quote settings',
				items: [
					{
						name: 'Show quote',
						desc: `Should a random quote from your custom quotes list, below, be displayed at the bottom of the new tab screen?`,
						control: {
							type: 'toggle',
							key: 'showQuote',
						},
					},
					{
						name: 'Custom quotes',
						desc: `${this.plugin.settings.customQuotes.length} quotes`,
						action: () => {
							new CustomQuotesModal(
								this.plugin,
								(modifiedCustomQuotes: CustomQuote[]) => {
									void this.updateSettings(
										{ customQuotes: modifiedCustomQuotes },
										{ redraw: true }
									);
								}
							).open();
						},
					},
					{
						name: 'Quotes file',
						desc: `A markdown file of blockquote-formatted quotes to draw from, in addition to the custom quotes above (not a replacement for them). Format: "> Quote text" followed by "> — Author" on its own line; author is optional. Currently: ${this.plugin.settings.fileQuotes.length} quotes loaded.`,
						control: {
							type: 'file',
							key: 'quotesFilePath',
							placeholder: 'E.g. Quotes/quotes.md',
							filter: (file) => file.extension === 'md',
						},
					},
					{
						name: 'Sync now',
						desc: 'Re-read the quotes file above and refresh the loaded quotes list',
						action: () => {
							void (async () => {
								await syncQuotesFile(
									this.app,
									this.plugin.settingsStore
								);
								this.update();
							})();
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Workspace',
				items: [
					{
						name: 'Include subfolders when closing tabs in a folder',
						desc: `When on, the close tabs in folder command also closes tabs in that folder's subfolders. When off, it only closes tabs directly inside the chosen folder.`,
						control: {
							type: 'toggle',
							key: 'closeTabsInFolderRecursive',
						},
					},
					{
						name: 'Widen stacked tab panes',
						desc: 'In stacked tab mode, make each pane fill the workspace instead of the narrower default. To pick a width between 40% and 100%, use the slider in Style Settings → Tab Candy.',
						control: {
							type: 'toggle',
							key: 'widenStackedTabPanes',
						},
					},
				],
			}
		);

		return [
			{
				type: 'page',
				name: 'Function',
				desc: 'New tab behavior, search, time, recent files, bookmarks, and quotes.',
				items: functionGroups,
			},
			{
				type: 'page',
				name: 'Design',
				desc: 'Backgrounds, tab bar colors, and overlay text.',
				status: () =>
					this.getDesignPageStatus(
						existingManualBackgroundFiles,
						existingBackgroundFiles
					),
				items: designGroups,
			},
		];
	}
}