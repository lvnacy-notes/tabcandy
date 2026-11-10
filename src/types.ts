import { ViewState, WorkspaceLeaf } from 'obsidian';
import { OverlayContrastResult } from './services/overlayContrast';

/** Maximum closed tabs remembered, and shown in the dashboard list. */
export const CLOSED_TABS_LIMIT = 5;

/** Identifiers of the plugins offered as search providers. */
export const SEARCH_PROVIDER = [
	'switcher',
	'omnisearch',
	'darlal-switcher-plus',
	'obsidian-another-quick-switcher',
];

/** View type under which the Tab Candy view is registered. */
export const TAB_CANDY_VIEW_TYPE = 'tabcandy-react-view';

/** Where the dashboard background comes from. */
export enum BackgroundTheme {
	CUSTOM = 'custom',
	LOCAL = 'local',
	TRANSPARENT = 'transparent',
	TRANSPARENT_WITH_SHADOWS = 'transparent with shadows',
}

/** Which bookmarks the dashboard lists. */
export enum BOOKMARK_SOURCE {
	ALL = 'all',
	GROUP = 'group',
}

/** Clock display format. */
export enum TIME_FORMAT {
	TWELVE_HOUR = '12-hour',
	TWENTY_FOUR_HOUR = '24-hour',
}

/** A closed tab: the state to reopen it from and its title at close time. */
export interface ClosedTabEntry {
	viewState: ViewState;
	title: string;
}

/** A user-supplied quote with its author. */
export interface CustomQuote {
	text: string;
	author: string;
}

/** The quote currently chosen for display. */
export interface Quote {
	content: string;
	author: string;
}

/** A command the search buttons run, with its display label. */
export interface SearchProvider {
	command: string;
	display: string;
}

/** Persisted plugin settings. */
export interface TabCandySettings {
	/** Stamped by `normalizeSettings()` on every load. */
	settingsVersion: number;
	/**
	 * When true, a new empty tab shows Tab Candy automatically. When false,
	 * only the "Open new tab" command does.
	 */
	replaceEmptyTabsWithTabCandy: boolean;
	/**
	 * When true, clicking a note in Recent Files, Bookmarks, or Recently
	 * closed tabs switches to its existing root-leaf tab instead of opening
	 * a second copy. Commands, links, the Quick Switcher and the File
	 * Explorer are unaffected.
	 */
	dashboardFocusesOpenTab: boolean;
	backgroundTheme: BackgroundTheme;
	/** Vault-relative path of the single image used by the CUSTOM theme. */
	customBackground: string;
	/** Vault-relative folder synced into `backgroundFiles`. */
	backgroundsFolder: string;
	/**
	 * Vault-relative image paths found by the last folder sync. Replaced
	 * wholesale on every sync; never holds manual picks.
	 */
	backgroundFiles: string[];
	/**
	 * Vault-relative image paths added one at a time. Kept apart from
	 * `backgroundFiles` so a folder sync doesn't drop them.
	 */
	manualBackgroundFiles: string[];
	showTopLeftSearchButton: boolean;
	topLeftSearchProvider: SearchProvider;
	showTime: boolean;
	timeFormat: TIME_FORMAT;
	showGreeting: boolean;
	greetingText: string;
	showInlineSearch: boolean;
	inlineSearchProvider: SearchProvider;
	showRecentFiles: boolean;
	showBookmarks: boolean;
	bookmarkSource: BOOKMARK_SOURCE;
	bookmarkGroup: string;
	showQuote: boolean;
	customQuotes: CustomQuote[];
	/**
	 * Vault-relative path of a markdown file of blockquote quotes. Synced on
	 * load and on vault events for this path; merged with `customQuotes` at
	 * draw time.
	 */
	quotesFilePath: string;
	/** Quotes parsed from `quotesFilePath`; replaced wholesale on every sync. */
	fileQuotes: CustomQuote[];
	/**
	 * When true, overlay text color is derived from the background image's
	 * dominant color. Only applies to the CUSTOM and LOCAL themes.
	 */
	autoContrastOverlayText: boolean;
	/**
	 * Computed overlay colors keyed by background image path, with the file
	 * mtime they were computed against.
	 */
	overlayTextContrastCache: Record<string, { mtime: number } & OverlayContrastResult>;
	/**
	 * When true, "Close tabs in folder…" also closes tabs in subfolders.
	 * When false, only tabs directly in the chosen folder close.
	 */
	closeTabsInFolderRecursive: boolean;
	/**
	 * Shows the Recently closed tabs list on the dashboard. Tracking and the
	 * "Reopen closed tab" command work regardless.
	 */
	showRecentlyClosedTabs: boolean;
	/**
	 * When true, stacked tab panes fill the workspace. The Style Settings
	 * slider can only narrow the width while this is on.
	 */
	widenStackedTabPanes: boolean;
}

/** A tab as seen by duplicate detection. */
export interface TabRecord {
	leaf: WorkspaceLeaf;
	/** `JSON.stringify([type, file])`, or null when the leaf has no file path. */
	key: string | null;
	/** True when the leaf is pinned, linked (non-null `group`), or unreadable. */
	isProtected: boolean;
}