import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { act } from 'react';
import { App as ObsidianApp } from 'obsidian';
import {
	createConfiguredApp,
	withEmptyPrivateRegistries
} from '../fakes';
import { normalizeSettings } from '../../settings/normalizeSettings';
import SettingsStore from '../../settings/SettingsStore';
import { TabCandyView } from '../../TabCandyView';

(window as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function buildApp(): ObsidianApp {
	return withEmptyPrivateRegistries(createConfiguredApp({ files: {} }));
}

function buildView(app: ObsidianApp): TabCandyView {
	const settingsStore = new SettingsStore(normalizeSettings({}), async () => {});
	return new TabCandyView(settingsStore, app.workspace.getLeaf(true));
}

async function open(view: TabCandyView): Promise<void> {
	await act(async () => {
		await view.onOpen();
	});
}

async function close(view: TabCandyView): Promise<void> {
	await act(async () => {
		await view.onClose();
	});
}

describe('TabCandyView + real App: full-stack lifecycle', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('mounts the real component tree, not just a placeholder', async () => {
		const app = buildApp();
		const view = buildView(app);

		await open(view);

		// The default-settings render includes the greeting and clock
		// sections - if the real hook stack (settings/quote/background/
		// bookmarks/recent-files) threw during mount, nothing here would be
		// present at all.
		expect(view.contentEl.querySelector('.tabcandy-wrapper')).not.toBeNull();
		expect(view.contentEl.querySelector('.tabcandy-greeting')).not.toBeNull();
		expect(view.contentEl.querySelector('.tabcandy-time')).not.toBeNull();
	});

	it('does not leak a second render across open -> close -> reopen', async () => {
		const app = buildApp();
		const view = buildView(app);

		await open(view);
		await close(view);
		await open(view);

		expect(view.contentEl.querySelectorAll('.tabcandy-wrapper').length).toBe(1);
	});

	it('mounts independently per leaf, including each one\'s own settings subscription', async () => {
		const app = buildApp();
		const viewOne = buildView(app);
		const viewTwo = buildView(app);

		await open(viewOne);
		await open(viewTwo);
		await close(viewOne);

		expect(viewOne.contentEl.children.length).toBe(0);
		expect(viewTwo.contentEl.querySelector('.tabcandy-wrapper')).not.toBeNull();
	});

	it('does not error when the settings store updates after the view has closed', async () => {
		const app = buildApp();
		const settingsStore = new SettingsStore(normalizeSettings({}), async () => {});
		const view = new TabCandyView(settingsStore, app.workspace.getLeaf(true));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		await open(view);

		await close(view);
		// If onClose() didn't actually tear down the subscription/effects
		// underneath (useSettings' subscribe, useClock's interval), this
		// would either throw or have React log an "update on an unmounted
		// component" warning to console.error.
		await act(async () => {
			await settingsStore.update({ greetingText: 'Still here?' });
		});

		expect(consoleError).not.toHaveBeenCalled();
	});
});
