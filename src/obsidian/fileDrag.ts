/** @file Reads and starts file drags through Obsidian's drag manager. */
import {
	App,
	TFile,
	WorkspaceLeaf
} from 'obsidian';
import { getTabPath } from '../tabs/tabPaths';

interface Draggable {
	file?: unknown;
	leaf?: WorkspaceLeaf;
}

interface DragManager {
	draggable?: Draggable | null;
	dragFile?: (
		event: DragEvent,
		file: TFile
	) => unknown;
}

/**
 * Reads the vault path of whatever Obsidian is currently dragging.
 *
 * @param app - The Obsidian app.
 * @returns The path of a dragged file or file tab, or null when the drag holds neither.
 */
export function getDraggedFilePath(app: App): string | null {
	const draggable = getDragManager(app)?.draggable;
	if (!draggable) {
		return null;
	}
	if (draggable.file instanceof TFile) {
		return draggable.file.path;
	}
	return draggable.leaf ? getTabPath(draggable.leaf) : null;
}

/**
 * Reads Obsidian's drag manager.
 *
 * @param app - The Obsidian app.
 * @returns The drag manager, or null when this version of Obsidian has none.
 */
function getDragManager(app: App): DragManager | null {
	const { dragManager } = app as unknown as { dragManager?: DragManager };
	return dragManager ?? null;
}

/**
 * Starts dragging a vault file so that dropping it on a pane opens it there. Does nothing when the file doesn't exist.
 *
 * @param app - The Obsidian app.
 * @param event - The drag start event.
 * @param path - Vault-relative file path.
 */
export function startFileDrag(
	app: App,
	event: DragEvent,
	path: string
): void {
	const file = app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) {
		getDragManager(app)?.dragFile?.(
			event,
			file
		);
	}
}