import {
	BOOKMARK_SOURCE,
	BackgroundTheme,
	SearchProvider,
	TIME_FORMAT,
	TabCandySettings,
} from '../types';

/** Obsidian's Quick Switcher, the provider used until the user picks another. */
const DEFAULT_SEARCH_PROVIDER: SearchProvider = {
	command: 'switcher:open',
	display: 'Obsidian Core Quick Switcher',
};

/** Default for every setting; `normalizeSettings()` falls back to these for missing or malformed values. */
export const DEFAULT_SETTINGS: TabCandySettings = {
	/** Always overwritten by `normalizeSettings()`. */
	settingsVersion: 0,
	replaceEmptyTabsWithTabCandy: true,
	dashboardFocusesOpenTab: false,
	backgroundTheme: BackgroundTheme.TRANSPARENT,
	customBackground: '',
	backgroundsFolder: '',
	backgroundFiles: [],
	manualBackgroundFiles: [],
	showTopLeftSearchButton: true,
	topLeftSearchProvider: DEFAULT_SEARCH_PROVIDER,
	showTime: true,
	timeFormat: TIME_FORMAT.TWELVE_HOUR,
	showGreeting: true,
	greetingText: 'Hello, Beautiful.',
	showInlineSearch: true,
	inlineSearchProvider: DEFAULT_SEARCH_PROVIDER,
	showRecentFiles: true,
	showBookmarks: false,
	bookmarkSource: BOOKMARK_SOURCE.ALL,
	bookmarkGroup: '',
	showQuote: true,
	customQuotes: [],
	quotesFilePath: '',
	fileQuotes: [],
	autoContrastOverlayText: false,
	overlayTextContrastCache: {},
	closeTabsInFolderRecursive: false,
	showRecentlyClosedTabs: false,
	widenStackedTabPanes: false,
	clusters: {},
	keepPairedClustersInSync: false,
	jumpToExistingCluster: false,
};