/** @file Helper for building the command dependencies in tests. */
import { App } from 'obsidian';
import ReadingCompanion from '../obsidian/ReadingCompanion';
import SettingsStore from '../settings/SettingsStore';
import type { CommandDependencies } from '../types';
import {
	cancelling,
	choosingNothing,
	confirmingNothing,
	pairingNothing,
	selectingNothing
} from './clusterHelpers';

/**
 * Builds command dependencies over fakes. Every prompt is cancelled unless overridden.
 *
 * @param app - The fake app.
 * @param settingsStore - The store.
 * @param overrides - Dependencies to replace.
 * @returns The dependencies.
 */
export function buildDependencies(
	app: App,
	settingsStore: SettingsStore,
	overrides: Partial<CommandDependencies> = {}
): CommandDependencies {
	return {
		app,
		settingsStore,
		promptForCluster: cancelling().prompt,
		promptForClusterChoice: choosingNothing().prompt,
		promptForClusterPair: pairingNothing().prompt,
		promptForClusterRemoval: selectingNothing().prompt,
		promptForConfirmation: confirmingNothing().prompt,
		readingCompanion: new ReadingCompanion(
			app,
			settingsStore
		),
		...overrides,
	};
}
