/** @file Tab-header context menu item that sets the reading companion. */
import {
	App,
	EventRef
} from 'obsidian';
import ReadingCompanion from './ReadingCompanion';
import {
	TAB_HEADER_SOURCE,
	type PromptForClusterChoice
} from '../types';

/**
 * Adds "Set reading companion" to a tab header's context menu for a file-backed root tab while a Cluster exists.
 *
 * @param app - The Obsidian app.
 * @param readingCompanion - The reading companion.
 * @param registerEvent - Registers the listener with the owning component.
 * @param prompt - Collects the choice of Cluster.
 */
export function registerReadingCompanionMenu(
	app: App,
	readingCompanion: ReadingCompanion,
	registerEvent: (eventRef: EventRef) => void,
	prompt: PromptForClusterChoice
): void {
	registerEvent(app.workspace.on(
		'file-menu',
		(
			menu,
			_file,
			source,
			leaf
		) => {
			if (source !== TAB_HEADER_SOURCE || !readingCompanion.canSet(leaf)) {
				return;
			}

			menu.addItem((item) => {
				item
					.setTitle('Set reading companion')
					.setIcon('book-open')
					.onClick(() => {
						readingCompanion.promptAndSet(
							prompt,
							leaf
						);
					});
			});
		}
	));
}