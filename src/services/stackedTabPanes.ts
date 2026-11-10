import SettingsStore from '../settings/SettingsStore';

/** Body class that makes stacked panes fill the available width. */
export const WIDEN_STACKED_PANES_CLASS = 'tabcandy-widen-stacked-panes';

/**
 * Keeps `tabcandy-widen-stacked-panes` on `<body>` in sync with
 * `widenStackedTabPanes`: present while on, absent while off (the default).
 *
 * Styling lives in styles.css; this function only toggles the class, so
 * theme and snippet rules for `--tab-stacked-pane-width` still compete by
 * the normal cascade. Targets `document.body` (main window only; popouts
 * are out of scope).
 *
 * @param settingsStore - Source of current settings and change notifications.
 * @param register - Receives the cleanup that unsubscribes and removes the
 *   class. The caller runs it on unload.
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