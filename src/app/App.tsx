/** @file The new tab page component. */
import {
	App as ObsidianApp,
	TFile,
	WorkspaceLeaf
} from 'obsidian';
import {
	KeyboardEvent,
	useEffect,
	useRef
} from 'react';
import {
	BackgroundSurface,
	Bookmarks,
	QuoteDisplay,
	RecentFiles,
	RecentlyClosedTabs,
	SearchButton,
} from './components';
import {
	useBackground,
	useBookmarks,
	useClock,
	useOverlayContrast,
	useQuote,
	useRecentFiles,
	useSettings,
} from './hooks';
import { executeEnabledPluginCommand } from '../newtab/pluginCommands';
import {
	focusOpenLeaf,
	getClosedTabs,
	getViewStateFilePath,
	removeClosedTab,
	reopenClosedTab,
} from '../tabs/tabNavigation';
import SettingsStore from '../settings/SettingsStore';
import { getTimeOfDayGreeting } from './utils/time';
import { BackgroundTheme, ClosedTabEntry } from '../types';

/**
 * The new tab page: a greeting, clock, search buttons, recent files,
 * bookmarks, recently closed tabs and a quote, each shown per settings.
 *
 * @param props.app - The Obsidian app.
 * @param props.settingsStore - Store holding the settings.
 * @param props.leaf - The leaf hosting this page.
 */
export default function App({
	app,
	settingsStore,
	leaf,
}: {
	app: ObsidianApp;
	settingsStore: SettingsStore;
	leaf: WorkspaceLeaf;
}) {
	const settings = useSettings(settingsStore);
	const time = useClock(settings.timeFormat);
	const quote = useQuote(settings.customQuotes, settings.fileQuotes);
	const background = useBackground(app, settings);
	const overlayTextColor = useOverlayContrast(app, settingsStore, settings, background);
	const recentFiles = useRecentFiles(app);
	const bookmarks = useBookmarks(app, settings);
	const mainDivRef = useRef<HTMLDivElement>(null);

	/**
	 * Opens `file` in the hosting leaf, or switches to a leaf that already
	 * has it open when dashboardFocusesOpenTab is on.
	 *
	 * @param file - The file to open.
	 */ 
	const openFile = (file: TFile) => {
		if (
			settings.dashboardFocusesOpenTab &&
			focusOpenLeaf(app, file.path, leaf)
		) {
			return;
		}
		void leaf.openFile(file);
	};

	/**
	 * Reopens a closed tab in the hosting leaf. When dashboardFocusesOpenTab
	 * is on and its file is open elsewhere, switches there and removes the
	 * entry instead.
	 *
	 * @param entry - The closed tab.
	 */
	const reopenTab = (entry: ClosedTabEntry) => {
		const path = getViewStateFilePath(entry.viewState);
		if (
			settings.dashboardFocusesOpenTab &&
			path !== null &&
			focusOpenLeaf(app, path, leaf)
		) {
			removeClosedTab(entry);
			return;
		}
		void reopenClosedTab(app, entry, leaf);
	};

	/** Runs the inline search provider's command. */
	const runInlineSearch = () =>
		executeEnabledPluginCommand(app, settings.inlineSearchProvider.command);

	/**
	 * Runs the inline search when a plain letter or digit key is pressed.
	 *
	 * @param event - The key event.
	 */
	const handleContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (!event.ctrlKey && !event.altKey && /^[A-Za-z0-9]$/.test(event.key)) {
			runInlineSearch();
		}
	};

	/** Focuses the container on mount. */
	useEffect(() => {
		mainDivRef.current?.focus();
	}, []);

	return (
		<BackgroundSurface
			background = { background }
			overlayTextColor = { overlayTextColor }
			transparent = { settings.backgroundTheme === BackgroundTheme.TRANSPARENT }
			transparentWithShadows = {
				settings.backgroundTheme ===
				BackgroundTheme.TRANSPARENT_WITH_SHADOWS
			}
			onKeyDown = { handleContainerKeyDown }
			containerRef = { mainDivRef }
		>
			<div className = 'tabcandy-wrapper'>
				<div className = 'tabcandy-top'>
					{ settings.showTopLeftSearchButton && (
						<SearchButton
							label = 'Open Search'
							iconName = 'search'
							className = 'tabcandy-iconbutton'
							textClassName = 'tabcandy-iconbutton-text'
							onClick = { () =>
								executeEnabledPluginCommand(
									app,
									settings.topLeftSearchProvider.command
								)
							}
						/>
					)}
				</div>
				<div className = 'tabcandy-center'>
					{ settings.showTime && (
						<div className = 'tabcandy-time'>{time}</div>
					)}
					{settings.showGreeting && (
						<div className = 'tabcandy-greeting'>
							{ settings.greetingText.replace(
								/{{greeting}}/gi,
								getTimeOfDayGreeting()
							)}
						</div>
					)}
				</div>
				<div className = 'tabcandy-bottom'>
					<div className = 'tabcandy-search'>
						{ settings.showInlineSearch && (
							<SearchButton
								label = 'Search'
								iconName = 'search'
								iconFirst
								className = 'tabcandy-search-wrapper'
								textClassName = 'tabcandy-search-text'
								onClick = { runInlineSearch }
							/>
						)}
					</div>
					{ settings.showRecentFiles && (
						<RecentFiles files = { recentFiles } onOpen = { openFile } />
					)}
					{ settings.showBookmarks && (
						<Bookmarks files = { bookmarks } onOpen = { openFile } />
					)}
					{ settings.showRecentlyClosedTabs && (
						<RecentlyClosedTabs entries = { getClosedTabs() } onOpen = { reopenTab } />
					)}
				</div>
				<QuoteDisplay quote = { quote } show = { settings.showQuote } />
			</div>
		</BackgroundSurface>
	);
}