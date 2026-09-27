import SettingsStore from '../settings/SettingsStore';

// The class Tab Candy's `body:where(...)` rule in styles.css keys on. Kept
// as a named export so a test (and this file's own doc comments) can refer
// to the exact string rather than a magic literal.
export const WIDEN_STACKED_PANES_CLASS = 'tabcandy-widen-stacked-panes';

/**
 * Keeps one class on `<body>` in sync with settings.widenStackedTabPanes:
 * present while the setting is on, absent while it's off (the default, so
 * a fresh install or an upgrade changes nothing until the user opts in).
 * styles.css's `body:where(.tabcandy-widen-stacked-panes)` rule is the only
 * thing that reacts to it - this function never touches
 * `--tab-stacked-pane-width` directly, so a theme's or user snippet's own
 * rule for that variable still competes by the normal cascade.
 *
 * Uses `document.body` rather than `activeDocument`, so the class is always
 * added to and removed from the same window - this is a main-window
 * feature; popouts are out of scope.
 *
 * `register` is passed in rather than this function reaching for
 * `Component.register()` itself, matching `registerNewTabHijack()`'s
 * caller-owns-cleanup convention in `newTabHijack.ts` (there via
 * `registerEvent`) - here the caller's `register()` is what actually runs
 * the cleanup on unload, not this function.
 */
export function registerStackedTabPanes(
	settingsStore: SettingsStore,
	register: (cleanup: () => void) => void
): void {
	const apply = (enabled: boolean): void => {
		document.body.toggleClass(WIDEN_STACKED_PANES_CLASS, enabled);
	};

	apply(settingsStore.get().widenStackedTabPanes);
	const unsubscribe = settingsStore.subscribe(
		(settings) => apply(settings.widenStackedTabPanes)
	);

	register(() => {
		unsubscribe();
		document.body.removeClass(WIDEN_STACKED_PANES_CLASS);
	});
}
