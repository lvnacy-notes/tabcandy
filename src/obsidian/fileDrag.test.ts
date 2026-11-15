/** @file Tests for reading and starting file drags. */
import {
	App,
	TFile,
	WorkspaceLeaf
} from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { getDraggedFilePath, startFileDrag } from './fileDrag';
import { setDragManager } from '../test/dragHelpers';
import { createConfiguredApp } from '../test/fakes';

/**
 * Looks up a file in the fake vault.
 *
 * @param app - The fake app.
 * @param path - Vault-relative path.
 * @returns The file.
 */
function getFile(app: App, path: string): TFile {
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) {
		throw new Error(`Expected '${path}' to resolve to a TFile in the fake vault`);
	}
	return file;
}

describe('getDraggedFilePath', () => {
	it('reads the path of a dragged file', () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		setDragManager(app, { draggable: { file: getFile(app, 'a.md') } });

		expect(getDraggedFilePath(app)).toBe('a.md');
	});

	it('reads the path of a dragged file tab', () => {
		const app = createConfiguredApp();
		const leaf = {
			getViewState: () => ({ type: 'markdown', state: { file: 'b.md' } }),
		} as unknown as WorkspaceLeaf;
		setDragManager(app, { draggable: { leaf } });

		expect(getDraggedFilePath(app)).toBe('b.md');
	});

	it('is null when the drag holds neither a file nor a tab', () => {
		const app = createConfiguredApp();
		setDragManager(app, { draggable: { type: 'text' } });

		expect(getDraggedFilePath(app)).toBeNull();
	});

	it('is null when nothing is being dragged', () => {
		const app = createConfiguredApp();
		setDragManager(app, { draggable: null });

		expect(getDraggedFilePath(app)).toBeNull();
	});

	it('is null when there is no drag manager', () => {
		const app = createConfiguredApp();
		setDragManager(app, undefined);

		expect(getDraggedFilePath(app)).toBeNull();
	});
});

describe('startFileDrag', () => {
	it('starts dragging the file', () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const dragFile = vi.fn();
		setDragManager(app, { dragFile });
		const event = new Event('dragstart') as DragEvent;

		startFileDrag(
			app,
			event,
			'a.md'
		);

		expect(dragFile).toHaveBeenCalledWith(event, getFile(app, 'a.md'));
	});

	it('does nothing for a file that does not exist', () => {
		const app = createConfiguredApp();
		const dragFile = vi.fn();
		setDragManager(app, { dragFile });

		startFileDrag(
			app,
			new Event('dragstart') as DragEvent,
			'gone.md'
		);

		expect(dragFile).not.toHaveBeenCalled();
	});

	it('does nothing when there is no drag manager', () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		setDragManager(app, undefined);

		expect(() => startFileDrag(
			app,
			new Event('dragstart') as DragEvent,
			'a.md'
		)).not.toThrow();
	});
});