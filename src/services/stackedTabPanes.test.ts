import {
	afterEach,
	describe,
	expect,
	it
} from 'vitest';
import SettingsStore from '../settings/SettingsStore';
import { buildSettings } from '../test/fakes';
import {
	WIDEN_STACKED_PANES_CLASS,
	registerStackedTabPanes,
} from './stackedTabPanes';

function buildStore(overrides: Parameters<typeof buildSettings>[0] = {}) {
	return new SettingsStore(buildSettings(overrides), async () => {});
}

// document.body is real, shared jsdom state, not something each test gets
// a fresh copy of - a class left on it by one test would otherwise leak
// into the next.
afterEach(() => {
	document.body.removeClass(WIDEN_STACKED_PANES_CLASS);
});

describe('registerStackedTabPanes', () => {
	it('leaves the class absent from <body> at registration when the setting is off (the default)', () => {
		const settingsStore = buildStore({ widenStackedTabPanes: false });

		registerStackedTabPanes(settingsStore, () => {});

		expect(document.body.hasClass(WIDEN_STACKED_PANES_CLASS)).toBe(false);
	});

	it('adds the class at registration when the setting is already on', () => {
		const settingsStore = buildStore({ widenStackedTabPanes: true });

		registerStackedTabPanes(settingsStore, () => {});

		expect(document.body.hasClass(WIDEN_STACKED_PANES_CLASS)).toBe(true);
	});

	it('adds the class when a settings update turns the setting on', async () => {
		const settingsStore = buildStore({ widenStackedTabPanes: false });
		registerStackedTabPanes(settingsStore, () => {});

		await settingsStore.update({ widenStackedTabPanes: true });

		expect(document.body.hasClass(WIDEN_STACKED_PANES_CLASS)).toBe(true);
	});

	it('removes the class when a settings update turns the setting back off', async () => {
		const settingsStore = buildStore({ widenStackedTabPanes: true });
		registerStackedTabPanes(settingsStore, () => {});

		await settingsStore.update({ widenStackedTabPanes: false });

		expect(document.body.hasClass(WIDEN_STACKED_PANES_CLASS)).toBe(false);
	});

	it('removes the class when the registered cleanup runs while the setting is on', () => {
		const settingsStore = buildStore({ widenStackedTabPanes: true });
		let cleanup: (() => void) | undefined;
		registerStackedTabPanes(settingsStore, (registered) => {
			cleanup = registered;
		});

		cleanup?.();

		expect(document.body.hasClass(WIDEN_STACKED_PANES_CLASS)).toBe(false);
	});

	it('stops responding to further settings updates once the registered cleanup has run', async () => {
		const settingsStore = buildStore({ widenStackedTabPanes: true });
		let cleanup: (() => void) | undefined;
		registerStackedTabPanes(settingsStore, (registered) => {
			cleanup = registered;
		});
		cleanup?.();

		await settingsStore.update({ widenStackedTabPanes: true });

		expect(document.body.hasClass(WIDEN_STACKED_PANES_CLASS)).toBe(false);
	});
});
