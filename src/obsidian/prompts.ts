/** @file Builds the prompts the plugin's features share, each backed by its modal. */
import { App } from 'obsidian';
import ChooseClusterModal from '../ui/ChooseClusterModal';
import ConfirmModal from '../ui/ConfirmModal';
import CreateClusterModal from '../ui/CreateClusterModal';
import PairClustersModal from '../ui/PairClustersModal';
import RemoveFromClustersModal from '../ui/RemoveFromClustersModal';
import type { Prompts } from '../types';

/**
 * Builds the prompts. Each opens its modal when called.
 *
 * @param app - The Obsidian app.
 * @returns The prompts.
 */
export function buildPrompts(app: App): Prompts {
	return {
		promptForCluster: (onSubmit) => {
			new CreateClusterModal(
				app,
				onSubmit
			).open();
		},
		promptForClusterChoice: (clusters, onSubmit, labels) => {
			new ChooseClusterModal(
				app,
				clusters,
				onSubmit,
				labels
			).open();
		},
		promptForClusterPair: (clusters, onSubmit) => {
			new PairClustersModal(
				app,
				clusters,
				onSubmit
			).open();
		},
		promptForClusterRemoval: (clusters, onSubmit) => {
			new RemoveFromClustersModal(
				app,
				clusters,
				onSubmit
			).open();
		},
		promptForConfirmation: (title, text, confirmLabel, onConfirm) => {
			new ConfirmModal(
				app,
				onConfirm,
				title,
				text,
				confirmLabel
			).open();
		},
	};
}
