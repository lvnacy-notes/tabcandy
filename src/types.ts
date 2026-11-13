/** @file Shared types and constants. */
import {
	App,
	ViewState,
	WorkspaceLeaf
} from 'obsidian';
import type SettingsStore from './settings/SettingsStore';

/**
 * Lowercase image file extensions, without the dot, accepted as
 * background images.
 */
export const BACKGROUND_IMAGE_EXTENSIONS = [
	'jpg',
	'jpeg',
	'png',
	'webp',
	'gif',
];

/** Maximum closed tabs remembered and shown in the dashboard list. */
export const CLOSED_TABS_LIMIT = 5;

/** View type the Cluster sidebar is registered under. */
export const CLUSTER_SIDEBAR_VIEW_TYPE = 'tabcandy-clusters';

/** Ids of the plugins offered as search providers. */
export const SEARCH_PROVIDER = [
	'switcher',
	'omnisearch',
	'darlal-switcher-plus',
	'obsidian-another-quick-switcher',
];

/** View type the Tab Candy view is registered under. */
export const TAB_CANDY_VIEW_TYPE = 'tabcandy-react-view';

/** `source` Obsidian passes to `file-menu` for a tab header's context menu. */
export const TAB_HEADER_SOURCE = 'tab-header';

/** Name of a Cluster whose stored name is missing or not a string. */
export const UNTITLED_CLUSTER_NAME = 'Untitled Cluster';

/** Source of the dashboard background. */
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

export type OverlayContrastCacheEntry = { mtime: number } & OverlayContrastResult;

export type OverlayContrastCache = Record<string, OverlayContrastCacheEntry>;

/** Asks the user for Cluster details; calls `onSubmit` once with them, or never if cancelled. */
export type PromptForCluster = (onSubmit: (draft: ClusterDraft) => void) => void;

/** Asks the user to pick one of `clusters`; calls `onSubmit` once with its id, or never if cancelled. */
export type PromptForClusterChoice = (
	clusters: TabCandyCluster[],
	onSubmit: (id: string) => void
) => void;

/** Asks the user to pick any of `clusters`; calls `onSubmit` once with their ids, or never if cancelled. */
export type PromptForClusterRemoval = (
	clusters: TabCandyCluster[],
	onSubmit: (ids: string[]) => void
) => void;

/** Clusters keyed by `id`. */
export type TabCandyClusters = Record<string, TabCandyCluster>;

/** A closed tab: the state to reopen it from and its title at close time. */
export interface ClosedTabEntry {
	/** State to reopen the tab from. */
	viewState: ViewState;
	/** Tab title at close time. */
	title: string;
}

/** Cluster details entered by the user. */
export interface ClusterDraft {
	/** Display name. May be blank. */
	name: string;
	/** Hex color. Unset means no Flavor. */
	flavor?: string;
}

/** What the commands need from the plugin. */
export interface CommandDependencies {
	/** The Obsidian app. */
	app: App;
	/** Store holding the settings. */
	settingsStore: SettingsStore;
	/** Collects the details of a new Cluster. */
	promptForCluster: PromptForCluster;
	/** Collects the choice of Cluster to add a file to. */
	promptForClusterChoice: PromptForClusterChoice;
	/** Collects the choice of Clusters to remove a file from. */
	promptForClusterRemoval: PromptForClusterRemoval;
}

/** A user-supplied quote with its author. */
export interface CustomQuote {
	/** Quote text. */
	text: string;
	/** Quote author. */
	author: string;
}

/** Details a new Cluster is created from. */
export interface NewClusterInput {
	name: string;
	/** Dropped unless it is a valid hex color. */
	flavor?: string;
	/** Initial members, in order. Duplicates are collapsed. */
	members?: string[];
}

export interface OverlayContrastResult {
	dominantColor: string;
	overlayTextColor: string;
}

/** The quote currently chosen for display. */
export interface Quote {
	/** Quote text. */
	content: string;
	/** Quote author. */
	author: string;
}

/** A command the search buttons run, with its display label. */
export interface SearchProvider {
	/** Id of the command to execute. */
	command: string;
	/** Label shown to the user. */
	display: string;
}

/** A persisted, named bundle of tabs. `members` is the Cluster; open state is derived from live leaves, never stored. */
export interface TabCandyCluster {
	/** Unique id; equals this Cluster's key in `TabCandySettings.clusters`. */
	id: string;
	/** Display name. */
	name: string;
	/** Vault-relative file paths, in order. Paths that no longer resolve are kept. */
	members: string[];
	/** Hex color (`#rgb`, `#rrggbb` or `#rrggbbaa`). Unset means no override. */
	flavor?: string;
	/** Layout captured via `getLayout()` for this Cluster's leaves. Unset until saved. */
	layoutSnapshot?: Record<string, unknown>;
	/** Epoch ms. Bumped by creation, adding or removing a member, and opening a Tray. */
	lastTouchedAt: number;
	/** Id of the paired Cluster, or null. Strictly 1:1 and reciprocal. */
	pairedWith: string | null;
}

/** Persisted plugin settings. */
export interface TabCandySettings {
	/** Stamped by `normalizeSettings()` on every load. */
	settingsVersion: number;
	/** When true, a new empty tab shows Tab Candy. When false, only the "Open new tab" command does. */
	replaceEmptyTabsWithTabCandy: boolean;
	/**
	 * When true, clicking a note in Recent Files, Bookmarks, or Recently
	 * closed tabs switches to its existing root-leaf tab instead of opening
	 * a second copy. Commands, links, the Quick Switcher and the File
	 * Explorer are unaffected.
	 */
	dashboardFocusesOpenTab: boolean;
	/** Selected background source. */
	backgroundTheme: BackgroundTheme;
	/** Vault-relative path of the image used by the CUSTOM theme. */
	customBackground: string;
	/** Vault-relative folder synced into `backgroundFiles`. */
	backgroundsFolder: string;
	/** Image paths found by the last folder sync. Replaced wholesale on each sync; never holds manual picks. */
	backgroundFiles: string[];
	/** Image paths added one at a time. Kept apart from `backgroundFiles` so a folder sync doesn't drop them. */
	manualBackgroundFiles: string[];
	/** Shows the top-left search button. */
	showTopLeftSearchButton: boolean;
	/** Command the top-left search button runs. */
	topLeftSearchProvider: SearchProvider;
	/** Shows the clock. */
	showTime: boolean;
	/** Clock display format. */
	timeFormat: TIME_FORMAT;
	/** Shows the greeting. */
	showGreeting: boolean;
	/** Greeting text. */
	greetingText: string;
	/** Shows the inline search. */
	showInlineSearch: boolean;
	/** Command the inline search runs. */
	inlineSearchProvider: SearchProvider;
	/** Shows the Recent Files list. */
	showRecentFiles: boolean;
	/** Shows the Bookmarks list. */
	showBookmarks: boolean;
	/** Which bookmarks the list shows. */
	bookmarkSource: BOOKMARK_SOURCE;
	/** Bookmark group listed when `bookmarkSource` is GROUP. */
	bookmarkGroup: string;
	/** Shows a quote. */
	showQuote: boolean;
	/** Quotes entered manually. */
	customQuotes: CustomQuote[];
	/** Vault-relative path of a markdown file of blockquote quotes. Synced on load and on vault events for this path. */
	quotesFilePath: string;
	/** Quotes parsed from `quotesFilePath`. Replaced wholesale on each sync. */
	fileQuotes: CustomQuote[];
	/** When true, overlay text color is derived from the background image's dominant color. Applies to the CUSTOM and LOCAL themes only. */
	autoContrastOverlayText: boolean;
	/** Computed overlay colors keyed by background image path, with the file mtime they were computed against. */
	overlayTextContrastCache: Record<string, { mtime: number } & OverlayContrastResult>;
	/** When true, "Close tabs in folder…" also closes tabs in subfolders. */
	closeTabsInFolderRecursive: boolean;
	/** Shows the Recently closed tabs list. Tracking and the "Reopen closed tab" command work regardless. */
	showRecentlyClosedTabs: boolean;
	/** When true, stacked tab panes fill the workspace. The Style Settings slider can only narrow the width while this is on. */
	widenStackedTabPanes: boolean;
	/** Persisted Clusters keyed by `id`. */
	clusters: TabCandyClusters;
	/** When true, reorder, open, close and remove on one Cluster mirror onto its paired Cluster. */
	keepPairedClustersInSync: boolean;
	/** When true, opening an already-open Tray or Cluster jumps to it instead of opening a duplicate. */
	jumpToExistingCluster: boolean;
}

/** A tab as seen by duplicate detection. */
export interface TabRecord {
	/** The tab's leaf. */
	leaf: WorkspaceLeaf;
	/** `JSON.stringify([type, file])`, or null when the leaf has no file path. */
	key: string | null;
	/** True when the leaf is pinned, linked (non-null `group`), or unreadable. */
	isProtected: boolean;
}