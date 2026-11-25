/** @file The skeleton of a vault watcher: which vault events it handles, registered in one place. */
import {
	App,
	EventRef,
	TAbstractFile
} from 'obsidian';

/** The vault events a watcher reacts to. Each handler is optional. */
export interface VaultWatchHandlers {
	/** A file was created or modified. */
	onChange?: (file: TAbstractFile) => void;
	/** A file was deleted. */
	onDelete?: (file: TAbstractFile) => void;
	/** A file was renamed or moved. */
	onRename?: (
		file: TAbstractFile, 
		oldPath: string
	) => void;
}

/**
 * Registers a listener for each handler given. `onChange` covers both `create` and `modify`.
 *
 * @param app - The Obsidian app.
 * @param registerEvent - Registers each listener with the owning component.
 * @param handlers - What the watcher does on each event.
 */
export function watchVault(
	app: App,
	registerEvent: (eventRef: EventRef) => void,
	handlers: VaultWatchHandlers
): void {
	const {
		onChange,
		onDelete,
		onRename
	} = handlers;

	if (onChange !== undefined) {
		registerEvent(app.vault.on(
			'create',
			onChange
		));
		registerEvent(app.vault.on(
			'modify',
			onChange
		));
	}
	if (onDelete !== undefined) {
		registerEvent(app.vault.on(
			'delete',
			onDelete
		));
	}
	if (onRename !== undefined) {
		registerEvent(app.vault.on(
			'rename',
			onRename
		));
	}
}
