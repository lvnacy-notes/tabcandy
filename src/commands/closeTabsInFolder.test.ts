/** @file Tests for the close-tabs-in-folder command. */
import {
	App,
	TFolder
} from 'obsidian';
import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './closeTabsInFolder';
import {
	addRootLeaf,
	createFakeWorkspaceApp
} from '../test/FakeWorkspace';
import { createFakeLeaf } from '../test/FakeWorkspaceLeaf';
import { buildSettings } from '../test/fakes';
import { collectRootLeaves } from '../test/commandHelpers';
import ChooseFolderModal from '../ui/ChooseFolderModal';
import SettingsStore from '../settings/SettingsStore';

afterEach(() => {
	vi.restoreAllMocks();
});

/**
 * Runs the command with the folder modal's `open` stubbed out.
 *
 * @param app - The fake app.
 * @param recursive - Value of `closeTabsInFolderRecursive`.
 * @returns The modal the command created.
 */
function invoke(app: App, recursive: boolean): ChooseFolderModal {
	const opened: ChooseFolderModal[] = [];
	vi.spyOn(ChooseFolderModal.prototype, 'open').mockImplementation(function (this: ChooseFolderModal) {
		opened.push(this);
	});
	const store = new SettingsStore(buildSettings({ closeTabsInFolderRecursive: recursive }), async () => {});

	buildInvokeCommand(app, store).callback?.();

	return opened[0];
}

/**
 * Adds a root leaf showing a file, creating the file and its folders.
 *
 * @param app - The fake app.
 * @param path - Vault-relative file path.
 * @returns The leaf.
 */
async function addFileLeaf(app: App, path: string) {
	const folders = path.split('/').slice(0, -1);
	let current = '';
	for (const folder of folders) {
		current = current === '' ? folder : `${ current }/${ folder }`;
		if (app.vault.getAbstractFileByPath(current) === null) {
			await app.vault.createFolder(current);
		}
	}
	await app.vault.create(path, '');
	const leaf = createFakeLeaf(app);
	await leaf.setViewState({ type: 'markdown', state: { file: path } });
	addRootLeaf(app, leaf);
	return leaf;
}

/**
 * Finds a folder that must exist.
 *
 * @param app - The fake app.
 * @param path - Vault-relative folder path.
 * @returns The folder.
 */
function getFolder(app: App, path: string): TFolder {
	const folder = app.vault.getFolderByPath(path);
	if (folder === null) {
		throw new Error(`No folder ${ path }`);
	}
	return folder;
}

describe('close-tabs-in-folder command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(createFakeWorkspaceApp(), new SettingsStore(buildSettings(), async () => {}));

		expect([command.id, command.name]).toEqual(['close-tabs-in-folder', 'Close tabs in folder…']);
	});

	it('opens the folder chooser', () => {
		const modal = invoke(createFakeWorkspaceApp({ files: {} }), false);

		expect(modal).toBeInstanceOf(ChooseFolderModal);
	});

	it('closes the tabs directly in the chosen folder', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		await addFileLeaf(app, 'Projects/a.md');
		const outside = await addFileLeaf(app, 'Notes/b.md');
		const modal = invoke(app, false);

		modal.onSubmit(getFolder(app, 'Projects'));

		expect(collectRootLeaves(app)).toEqual([outside]);
	});

	it('leaves subfolder tabs open when recursion is off', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const nested = await addFileLeaf(app, 'Projects/2024/a.md');
		const modal = invoke(app, false);

		modal.onSubmit(getFolder(app, 'Projects'));

		expect(collectRootLeaves(app)).toEqual([nested]);
	});

	it('closes subfolder tabs when recursion is on', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		await addFileLeaf(app, 'Projects/2024/a.md');
		const modal = invoke(app, true);

		modal.onSubmit(getFolder(app, 'Projects'));

		expect(collectRootLeaves(app)).toEqual([]);
	});
});