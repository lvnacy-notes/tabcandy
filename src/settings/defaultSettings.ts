import {
	BOOKMARK_SOURCE,
	BackgroundTheme,
	SearchProvider,
	TIME_FORMAT,
	TabCandySettings,
} from '../types';

/** Search provider used until the user picks another: Obsidian's Quick Switcher. */
const DEFAULT_SEARCH_PROVIDER: SearchProvider = {
	command: 'switcher:open',
	display: 'Obsidian Core Quick Switcher',
};

/**
 * Baseline for every setting. `normalizeSettings()` starts from these and
 * overlays validated user data, so each field here is the fallback for a
 * missing or malformed value.
 */
export const DEFAULT_SETTINGS: TabCandySettings = {
	/** Always overwritten by normalizeSettings(); must not be load-bearing. */
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
};