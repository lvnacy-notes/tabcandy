/** @file Tests for the Resolve missing members modal. */
import { TFile } from 'obsidian';
import { Notice as NoticeMock } from 'obsidian-test-mocks/obsidian';
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import ResolveMissingModal from './ResolveMissingModal';
import { buildStoreWith } from '../test/clusterHelpers';
import {
	buildCluster,
	createConfiguredApp
} from '../test/fakes';
import { findButton } from '../test/modalHelpers';
import SettingsStore from '../settings/SettingsStore';

/** A file search the modal created: its input and the callback it reports a pick to. */
interface Suggest {
	inputEl: HTMLInputElement;
	onPick: (file: TFile) => void;
}

/** Every file search the modal created, in creation order. */
const suggests = vi.hoisted((): Suggest[] => []);

/** Replaces the file search with one that records its input and callback. */
vi.mock('./FileInputSuggest', () => ({ default: class {
	/**
	 * @param _app - The Obsidian app.
	 * @param inputEl - The input the search sits under.
	 * @param onPick - Called with the picked file.
	 */
	constructor(_app: unknown, inputEl: HTMLInputElement, onPick: (file: TFile) => void) {
		suggests.push({
			inputEl,
			onPick
		});
	}
} }));

beforeEach(() => {
	suggests.length = 0;
	vi.useFakeTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

/**
 * Opens a modal over one Cluster.
 *
 * @param members - The Cluster's members.
 * @param files - Paths that exist in the vault.
 * @param focusPath - Missing path whose field starts focused.
 * @returns The modal, the store and a way to look up vault files.
 */
function openModal(
	members: string[],
	files: string[],
	focusPath?: string
): {
	modal: ResolveMissingModal;
	store: SettingsStore;
	getFile: (path: string) => TFile;
} {
	const app = createConfiguredApp({ files: Object.fromEntries(files.map((path) => [
		path,
		''
	])) });
	const store = buildStoreWith(buildCluster({
		id: 'one',
		members
	}));
	const modal = new ResolveMissingModal(
		app,
		store,
		'one',
		focusPath
	);
	modal.open();
	// Discards the mock's auto-close timer.
	vi.clearAllTimers();
	return {
		modal,
		store,
		getFile: (path) => {
			const file = app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) {
				throw new Error(`Expected '${path}' to resolve to a TFile in the fake vault`);
			}
			return file;
		},
	};
}

describe('ResolveMissingModal', () => {
	it('gives each missing member a file search and skips the members that exist', () => {
		const { modal } = openModal([
			'a.md',
			'gone.md',
			'also-gone.md'
		], ['a.md']);

		expect(suggests).toHaveLength(2);
		expect(modal.contentEl.textContent).toContain('gone.md');
		expect(modal.contentEl.textContent).toContain('also-gone.md');
	});

	it('replaces a missing member with the picked file at the same position', async () => {
		const {
			store,
			getFile
		} = openModal([
			'a.md',
			'gone.md',
			'c.md'
		], [
			'a.md',
			'b.md',
			'c.md'
		]);

		suggests[0].onPick(getFile('b.md'));
		await vi.runAllTimersAsync();

		expect(store.get().clusters['one'].members).toEqual([
			'a.md',
			'b.md',
			'c.md'
		]);
	});

	it('shows a notice and replaces nothing when the picked file is already a member', async () => {
		const {
			modal,
			store,
			getFile
		} = openModal([
			'a.md',
			'gone.md'
		], ['a.md']);
		const notice = vi.spyOn(
			NoticeMock.prototype,
			'constructor__'
		);

		suggests[0].onPick(getFile('a.md'));
		await vi.runAllTimersAsync();

		expect(notice).toHaveBeenCalledWith(
			'Already in this cluster.',
			undefined
		);
		expect(store.get().clusters['one'].members).toEqual([
			'a.md',
			'gone.md'
		]);
		expect(modal.getMissing()).toEqual(['gone.md']);
	});

	it('closes once the last missing member is resolved', async () => {
		const {
			modal,
			getFile
		} = openModal(
			['gone.md'],
			['b.md']
		);
		const close = vi.spyOn(
			modal,
			'close'
		);

		suggests[0].onPick(getFile('b.md'));
		await vi.runAllTimersAsync();

		expect(close).toHaveBeenCalled();
	});

	it('keeps listing the members that are still missing after one is resolved', async () => {
		const {
			modal,
			getFile
		} = openModal([
			'gone.md',
			'also-gone.md'
		], ['b.md']);

		suggests[0].onPick(getFile('b.md'));
		await vi.runAllTimersAsync();

		expect(modal.contentEl.querySelectorAll('input')).toHaveLength(1);
		expect(modal.getMissing()).toEqual(['also-gone.md']);
	});

	it('removes every missing member with Remove all missing and closes', async () => {
		const {
			modal,
			store
		} = openModal([
			'a.md',
			'gone.md',
			'also-gone.md'
		], ['a.md']);
		const close = vi.spyOn(
			modal,
			'close'
		);

		findButton(
			modal,
			'Remove all missing'
		).click();
		await vi.runAllTimersAsync();

		expect(close).toHaveBeenCalled();
		expect(store.get().clusters['one'].members).toEqual(['a.md']);
	});

	it('focuses the search field of the member it was opened for', () => {
		const focus = vi.spyOn(
			HTMLInputElement.prototype,
			'focus'
		);

		openModal(
			[
				'gone.md',
				'also-gone.md'
			],
			[],
			'also-gone.md'
		);

		expect(focus.mock.contexts).toHaveLength(1);
		expect(focus.mock.contexts[0]).toBe(suggests[1].inputEl);
	});

	it('closes at once when nothing is missing', () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const store = buildStoreWith(buildCluster({
			id: 'one',
			members: ['a.md']
		}));
		const modal = new ResolveMissingModal(
			app,
			store,
			'one'
		);
		const close = vi.spyOn(
			modal,
			'close'
		);

		modal.open();

		expect(close).toHaveBeenCalled();
	});
});