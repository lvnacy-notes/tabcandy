/** @file Tests for the vault event listeners: that each registers the expected events and applies them to settings. */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	registerBackgroundVaultWatchers,
	registerClusterRenameWatcher,
	registerQuotesVaultWatcher
} from './vaultWatchers';
import {
	buildCluster,
	buildClusters,
	buildSettings,
	createConfiguredApp,
	getExistingFile
} from '../test/fakes';
import SettingsStore from '../settings/SettingsStore';

/**
 * Builds a settings store that discards its saves.
 *
 * @param overrides - Settings to override the defaults with.
 * @returns The store.
 */
function buildStore(overrides: Parameters<typeof buildSettings>[0] = {}) {
	return new SettingsStore(buildSettings(overrides), async () => {});
}

describe('registerBackgroundVaultWatchers', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * Registers the background watchers on a vault with one background image.
	 *
	 * @param overrides - Settings to override the defaults with.
	 * @returns The app, the store and the `registerEvent` spy.
	 */
	function setUp(overrides: Parameters<typeof buildSettings>[0] = {}) {
		const app = createConfiguredApp({
			files: { 'Backgrounds/existing.png': '' },
		});
		const store = buildStore({ backgroundsFolder: 'Backgrounds', ...overrides });
		const registerEvent = vi.fn();
		registerBackgroundVaultWatchers(app, store, registerEvent);
		return { app, store, registerEvent };
	}

	it('registers exactly one listener each for create, modify, delete, and rename', () => {
		const { registerEvent } = setUp();

		expect(registerEvent).toHaveBeenCalledTimes(4);
	});

	it('re-syncs the backgrounds folder 500ms after a file is created inside it', async () => {
		const { app, store } = setUp();

		await app.vault.create('Backgrounds/new.png', '');
		expect(store.get().backgroundFiles).not.toContain('Backgrounds/new.png');

		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual([
			'Backgrounds/existing.png',
			'Backgrounds/new.png',
		]);
	});

	it('does not re-sync when a file is created outside the configured folder', async () => {
		const { app, store } = setUp();
		expect(store.get().backgroundFiles).toEqual([]);

		await app.vault.createFolder('Elsewhere');
		await app.vault.create('Elsewhere/new.png', '');
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual([]);
	});

	it('re-syncs after a file inside the folder is modified', async () => {
		const { app, store } = setUp();

		await app.vault.adapter.write('Backgrounds/existing.png', 'new bytes');
		const file = getExistingFile(app, 'Backgrounds/existing.png');

		app.vault.trigger('modify', file);
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual(['Backgrounds/existing.png']);
	});

	it('collapses a burst of create events into a single debounced sync', async () => {
		const { app, store } = setUp();

		await app.vault.create('Backgrounds/one.png', '');
		vi.advanceTimersByTime(200);
		await app.vault.create('Backgrounds/two.png', '');
		vi.advanceTimersByTime(200);
		await app.vault.create('Backgrounds/three.png', '');

		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual([
			'Backgrounds/existing.png',
			'Backgrounds/one.png',
			'Backgrounds/three.png',
			'Backgrounds/two.png',
		]);
	});

	it('removes a deleted file from manualBackgroundFiles', async () => {
		const { app, store } = setUp({
			manualBackgroundFiles: ['Elsewhere/picture.png'],
		});
		await app.vault.createFolder('Elsewhere');
		await app.vault.create('Elsewhere/picture.png', '');
		const file = getExistingFile(app, 'Elsewhere/picture.png');

		await app.fileManager.trashFile(file);

		expect(store.get().manualBackgroundFiles).toEqual([]);
	});

	it('leaves manualBackgroundFiles untouched when the deleted file was not in it', async () => {
		const { app, store } = setUp({
			manualBackgroundFiles: ['Elsewhere/keep.png'],
		});
		await app.vault.createFolder('Elsewhere');
		await app.vault.create('Elsewhere/other.png', '');
		const file = getExistingFile(app, 'Elsewhere/other.png');

		await app.fileManager.trashFile(file);

		expect(store.get().manualBackgroundFiles).toEqual(['Elsewhere/keep.png']);
	});

	it('re-syncs when a file inside the configured folder is deleted', async () => {
		const { app, store } = setUp();
		const file = getExistingFile(app, 'Backgrounds/existing.png');

		await app.fileManager.trashFile(file);
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual([]);
	});

	it('updates a manualBackgroundFiles entry to its new path on rename', async () => {
		const { app, store } = setUp({
			manualBackgroundFiles: ['Elsewhere/old-name.png'],
		});
		await app.vault.createFolder('Elsewhere');
		await app.vault.create('Elsewhere/old-name.png', '');
		const file = getExistingFile(app, 'Elsewhere/old-name.png');

		await app.vault.rename(file, 'Elsewhere/new-name.png');

		expect(store.get().manualBackgroundFiles).toEqual([
			'Elsewhere/new-name.png',
		]);
	});

	it('re-syncs when a file is renamed into the configured folder', async () => {
		const { app, store } = setUp();
		await app.vault.createFolder('Elsewhere');
		await app.vault.create('Elsewhere/incoming.png', '');
		const file = getExistingFile(app, 'Elsewhere/incoming.png');

		await app.vault.rename(file, 'Backgrounds/incoming.png');
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual([
			'Backgrounds/existing.png',
			'Backgrounds/incoming.png',
		]);
	});

	it('re-syncs when a file is renamed out of the configured folder', async () => {
		const { app, store } = setUp();
		const file = getExistingFile(app, 'Backgrounds/existing.png');

		await app.vault.rename(file, 'Elsewhere/existing.png');
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().backgroundFiles).toEqual([]);
	});
});

describe('registerClusterRenameWatcher', () => {
	/**
	 * Registers the rename watcher with one Cluster holding `members`.
	 *
	 * @param files - Vault files to create, keyed by path.
	 * @param members - Member paths of the Cluster.
	 * @returns The app, the store and the `registerEvent` spy.
	 */
	function setUp(files: Record<string, string>, members: string[]) {
		const app = createConfiguredApp({ files });
		const store = new SettingsStore(
			buildSettings({
				clusters: buildClusters(buildCluster({ id: 'a', members })),
			}),
			async () => {}
		);
		const registerEvent = vi.fn();
		registerClusterRenameWatcher(
			app,
			store,
			registerEvent
		);
		return { app, store, registerEvent };
	}

	it('registers exactly one listener', () => {
		const { registerEvent } = setUp({}, []);

		expect(registerEvent).toHaveBeenCalledTimes(1);
	});

	it('patches the member path when a file is renamed', async () => {
		const { app, store } = setUp({ 'Notes/old.md': '' }, ['Notes/old.md']);
		const file = getExistingFile(app, 'Notes/old.md');

		await app.vault.rename(file, 'Notes/new.md');

		expect(store.get().clusters.a.members).toEqual(['Notes/new.md']);
	});

	it('patches the member path when a file is moved to another folder', async () => {
		const { app, store } = setUp({ 'Notes/old.md': '' }, ['Notes/old.md']);
		const file = getExistingFile(app, 'Notes/old.md');

		await app.vault.rename(file, 'Archive/old.md');

		expect(store.get().clusters.a.members).toEqual(['Archive/old.md']);
	});

	it('does not save when the renamed file is in no Cluster', async () => {
		const { app, store } = setUp(
			{ 'Notes/other.md': '' },
			['Notes/member.md']
		);
		const updateSpy = vi.spyOn(store, 'update');
		const file = getExistingFile(app, 'Notes/other.md');

		await app.vault.rename(file, 'Notes/renamed.md');

		expect(updateSpy).not.toHaveBeenCalled();
	});

	it('does not drop a member whose file is deleted', async () => {
		const { app, store } = setUp({ 'Notes/member.md': '' }, ['Notes/member.md']);
		const file = getExistingFile(app, 'Notes/member.md');

		await app.fileManager.trashFile(file);

		expect(store.get().clusters.a.members).toEqual(['Notes/member.md']);
	});
});

describe('registerQuotesVaultWatcher', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	/**
	 * Registers the quotes watcher on a vault with one quotes file.
	 *
	 * @param overrides - Settings to override the defaults with.
	 * @returns The app, the store and the `registerEvent` spy.
	 */
	function setUp(overrides: Parameters<typeof buildSettings>[0] = {}) {
		const app = createConfiguredApp({
			files: { 'Quotes/quotes.md': '> Existing quote.\n> — Existing Author' },
		});
		const store = buildStore({ quotesFilePath: 'Quotes/quotes.md', ...overrides });
		const registerEvent = vi.fn();
		registerQuotesVaultWatcher(app, store, registerEvent);
		return { app, store, registerEvent };
	}

	it('registers exactly one listener each for create, modify, delete, and rename', () => {
		const { registerEvent } = setUp();

		expect(registerEvent).toHaveBeenCalledTimes(4);
	});

	it('re-syncs the quotes file 500ms after it is modified', async () => {
		const { app, store } = setUp();

		await app.vault.adapter.write('Quotes/quotes.md', '> Updated quote.');
		const file = getExistingFile(app, 'Quotes/quotes.md');

		app.vault.trigger('modify', file);
		expect(store.get().fileQuotes).not.toEqual([
			{ text: 'Updated quote.', author: '' },
		]);

		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Updated quote.', author: '' },
		]);
	});

	it('does not re-sync when a different file is modified', async () => {
		const { app, store } = setUp();
		await app.vault.create('Quotes/other.md', '> Some other quote.');
		const file = getExistingFile(app, 'Quotes/other.md');

		app.vault.trigger('modify', file);
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([]);
	});

	it('collapses a burst of modify events into a single debounced sync', async () => {
		const { app, store } = setUp();

		for (let i = 0; i < 3; i++) {
			await app.vault.adapter.write('Quotes/quotes.md', `> Version ${i}.`);
			const file = getExistingFile(app, 'Quotes/quotes.md');
			app.vault.trigger('modify', file);
			vi.advanceTimersByTime(200);
		}
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Version 2.', author: '' },
		]);
	});

	it('re-syncs when the configured file is created (configured before the file existed)', async () => {
		const app = createConfiguredApp({ files: {} });
		const store = buildStore({ quotesFilePath: 'Quotes/quotes.md' });
		const registerEvent = vi.fn();
		registerQuotesVaultWatcher(app, store, registerEvent);

		await app.vault.createFolder('Quotes');
		await app.vault.create('Quotes/quotes.md', '> Brand new quote.');
		await vi.advanceTimersByTimeAsync(500);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Brand new quote.', author: '' },
		]);
	});

	it('clears fileQuotes immediately (no debounce) when the configured file is deleted', async () => {
		const { app, store } = setUp({
			fileQuotes: [{ text: 'Existing quote.', author: 'Existing Author' }],
		});
		const file = getExistingFile(app, 'Quotes/quotes.md');

		// Vault.delete() fires the 'delete' event.
		await app.fileManager.trashFile(file);

		expect(store.get().fileQuotes).toEqual([]);
	});

	it('leaves fileQuotes untouched when a different file is deleted', async () => {
		const { app, store } = setUp({
			fileQuotes: [{ text: 'Existing quote.', author: 'Existing Author' }],
		});
		await app.vault.create('Quotes/other.md', '> Some other quote.');
		const file = getExistingFile(app, 'Quotes/other.md');

		await app.fileManager.trashFile(file);

		expect(store.get().fileQuotes).toEqual([
			{ text: 'Existing quote.', author: 'Existing Author' },
		]);
	});

	it('updates quotesFilePath to the new path on rename, without discarding the already-synced quotes', async () => {
		const { app, store } = setUp({
			fileQuotes: [{ text: 'Existing quote.', author: 'Existing Author' }],
		});
		const file = getExistingFile(app, 'Quotes/quotes.md');

		await app.vault.rename(file, 'Quotes/renamed.md');

		expect(store.get().quotesFilePath).toBe('Quotes/renamed.md');
		expect(store.get().fileQuotes).toEqual([
			{ text: 'Existing quote.', author: 'Existing Author' },
		]);
	});

	it('does not react to a rename of an unrelated file', async () => {
		const { app, store } = setUp();
		await app.vault.create('Quotes/other.md', '> Some other quote.');
		const file = getExistingFile(app, 'Quotes/other.md');

		await app.vault.rename(file, 'Quotes/renamed-other.md');

		expect(store.get().quotesFilePath).toBe('Quotes/quotes.md');
	});
});