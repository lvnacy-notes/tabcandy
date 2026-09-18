import { OverlayContrastResult } from './services/overlayContrast';

export enum BackgroundTheme {
	CUSTOM = 'custom',
	LOCAL = 'local',
	TRANSPARENT = 'transparent',
	TRANSPARENT_WITH_SHADOWS = 'transparent with shadows',
}

export enum TIME_FORMAT {
	TWELVE_HOUR = '12-hour',
	TWENTY_FOUR_HOUR = '24-hour',
}

export enum BOOKMARK_SOURCE {
	ALL = 'all',
	GROUP = 'group',
}

export interface SearchProvider {
	command: string;
	display: string;
}

export interface CustomQuote {
	text: string;
	author: string;
}

/**
 * A quote selected from the user's custom quotes list.
 */
export interface Quote {
	content: string;
	author: string;
}

export interface TabCandySettings {
	/**
	 * Stamped by normalizeSettings() on every load, including a fresh
	 * install with no data.json at all - see CURRENT_SETTINGS_VERSION in
	 * normalizeSettings.ts for what bumping it means.
	 */
	settingsVersion: number;
	/**
	 * Drives src/services/newTabHijack.ts's workspace `layout-change`
	 * watcher: when true, opening a new empty tab automatically shows Tab
	 * Candy. When false, Tab Candy only opens via the "open new tab"
	 * command (see activateView() in the same file). Defaulted on so this
	 * matches the plugin's out-of-the-box behavior.
	 */
	replaceEmptyTabsWithTabCandy: boolean;
	backgroundTheme: BackgroundTheme;
	/**
	 * A vault-relative path to a single image, picked via the `file`
	 * control's vault suggester (SettingsTab.ts) - not a literal URL.
	 * Resolved to a displayable resource URL by useBackground(), the same
	 * way manualBackgroundFiles/backgroundFiles entries are.
	 */
	customBackground: string;
	/**
	 * Vault-relative folder path (e.g. "Assets/Tab Candy") synced via
	 * src/services/backgrounds.ts using the public vault adapter.
	 */
	backgroundsFolder: string;
	/**
	 * Vault-relative file paths discovered by the last folder sync. Paths
	 * only, never image bytes - resolved to a displayable URL at render
	 * time via getBackgroundResourcePath(), not cached as data here.
	 * Overwritten wholesale on every sync - do not append individually
	 * picked images here (see manualBackgroundFiles below).
	 */
	backgroundFiles: string[];
	/**
	 * Vault-relative paths for images added one at a time via "Add vault
	 * image", as opposed to backgroundFiles' whole-folder sync. Kept as a
	 * separate field rather than appended into backgroundFiles because
	 * syncBackgroundsFolder() replaces backgroundFiles entirely on every
	 * sync - folding manual picks into that array would silently drop them
	 * the next time "Sync now" runs or the plugin reloads. Paths only, same
	 * as backgroundFiles.
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
	 * Vault-relative path to a single markdown file of blockquote-formatted
	 * quotes (see src/services/quotes.ts), synced the same way
	 * backgroundsFolder is: on load and on vault create/modify/delete/rename
	 * events targeting this specific path. Additive alongside customQuotes,
	 * not a replacement for it - the two lists are merged at draw time.
	 */
	quotesFilePath: string;
	/**
	 * Quotes parsed out of quotesFilePath by the last sync. Overwritten
	 * wholesale on every sync, same as backgroundFiles - never partially
	 * merged with a prior result.
	 */
	fileQuotes: CustomQuote[];
	/**
	 * Toggles automatic overlay-text contrast against the active
	 * background image's own dominant color (src/services/overlayContrast.ts),
	 * in place of the fixed #dadada literal. Only meaningful when
	 * backgroundTheme is CUSTOM or LOCAL - see this setting's `visible`
	 * condition in SettingsTab.ts.
	 */
	autoContrastOverlayText: boolean;
	/**
	 * Computed overlay-contrast results, keyed by the vault-relative path
	 * of the background image each entry was computed for. A computed
	 * color is a stable property of a specific image (by content, not by
	 * when it was viewed), so this is persisted rather than session-only -
	 * see useOverlayContrast() in hooks.ts for cache reads and
	 * pruneStaleOverlayContrastCache() in backgrounds.ts for cleanup of
	 * entries whose file has since been deleted or edited.
	 */
	overlayTextContrastCache: Record<string, { mtime: number } & OverlayContrastResult>;
}