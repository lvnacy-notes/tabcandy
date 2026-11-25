/** @file Pairing Clusters, unlinking them and finding the Cluster the user is working in. */
import {
	App,
	Notice
} from 'obsidian';
import { getTabPath } from '../tabs/tabPaths';
import {
	getClustersContainingPath,
	pairClusters,
	unpairCluster
} from './clusters';
import SettingsStore from '../settings/SettingsStore';
import {
	type PromptForClusterChoice,
	type PromptForConfirmation,
	type TabCandyCluster,
	type TabCandyClusters
} from '../types';

/**
 * Words the Pairings that pairing `source` with `target` would unlink.
 *
 * @param clusters - The current Clusters.
 * @param source - The Cluster being paired.
 * @param target - The Cluster it is being paired with.
 * @returns One sentence pair per Cluster that is already paired with a third, or an empty string when nothing would be unlinked.
 */
export function describeUnlinks(
	clusters: TabCandyClusters,
	source: TabCandyCluster,
	target: TabCandyCluster
): string {
	const sentences: string[] = [];
	const sides: Array<{
		cluster: TabCandyCluster;
		other: TabCandyCluster
	}> = [
		{
			cluster: source,
			other: target
		},
		{
			cluster: target,
			other: source
		},
	];
	for (const {
		cluster,
		other
	} of sides) {
		const third = cluster.pairedWith === null ? undefined : clusters[cluster.pairedWith];
		if (third !== undefined && third.id !== other.id) {
			sentences.push(`${ cluster.name } is paired with ${ third.name }. Pairing it with ${ other.name } unlinks ${ third.name }.`);
		}
	}
	return sentences.join(' ');
}

/**
 * Finds the Clusters the user is working in: every Cluster holding the active tab's file.
 *
 * @param app - The Obsidian app.
 * @param settingsStore - Store holding the Clusters.
 * @returns The Clusters, empty when there are none.
 */
export function getActiveClusters(app: App, settingsStore: SettingsStore): TabCandyCluster[] {
	const leaf = app.workspace.getMostRecentLeaf();
	if (leaf === null) {
		return [];
	}

	const { clusters } = settingsStore.get();
	const path = getTabPath(leaf);
	return path === null ? [] : getClustersContainingPath(
		clusters,
		path
	);
}

/**
 * Pairs two Clusters and saves, asking first when that would unlink a third. Shows "Already paired" when they already are.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param confirm - Collects the confirmation.
 * @param sourceId - Id of the Cluster being paired.
 * @param targetId - Id of the Cluster it is being paired with.
 */
export function pairWithConfirmation(
	settingsStore: SettingsStore,
	confirm: PromptForConfirmation,
	sourceId: string,
	targetId: string
): void {
	const { clusters } = settingsStore.get();
	const source = clusters[sourceId];
	const target = clusters[targetId];
	if (source === undefined || target === undefined || sourceId === targetId) {
		return;
	}
	if (source.pairedWith === targetId) {
		new Notice('Already paired.');
		return;
	}

	/** Pairs the two against the Clusters as they are when it runs. */
	const pair = (): void => {
		const current = settingsStore.get().clusters;
		const next = pairClusters(
			current,
			sourceId,
			targetId
		);
		if (next === current) {
			return;
		}
		void settingsStore.update({ clusters: next }).then(() => {
			new Notice(`Paired ${ source.name } with ${ target.name }.`);
		});
	};

	const warning = describeUnlinks(
		clusters,
		source,
		target
	);
	if (warning === '') {
		pair();
		return;
	}
	confirm(
		'Pair clusters',
		warning,
		'Confirm',
		pair
	);
}

/**
 * Asks which Cluster to pair `sourceId` with, then pairs them. Shows a notice when there is no other Cluster.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param promptChoice - Collects the choice of target.
 * @param confirm - Collects the confirmation.
 * @param sourceId - Id of the Cluster being paired.
 */
export function promptAndPair(
	settingsStore: SettingsStore,
	promptChoice: PromptForClusterChoice,
	confirm: PromptForConfirmation,
	sourceId: string
): void {
	const { clusters } = settingsStore.get();
	const source = clusters[sourceId];
	if (source === undefined) {
		return;
	}

	const targets = Object.values(clusters).filter((cluster) => cluster.id !== sourceId);
	if (targets.length === 0) {
		new Notice('No other cluster to pair with.');
		return;
	}
	promptChoice(
		targets,
		(targetId) => {
			pairWithConfirmation(
				settingsStore,
				confirm,
				sourceId,
				targetId
			);
		},
		{
			action: 'Pair',
			title: `Pair ${ source.name } with`
		}
	);
}

/**
 * Unlinks a Cluster from its partner after a confirmation. When several of `candidates` are paired, asks which first.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param promptChoice - Collects the choice among paired Clusters.
 * @param confirm - Collects the confirmation.
 * @param candidates - The Clusters to unlink one of.
 */
export function promptAndUnlink(
	settingsStore: SettingsStore,
	promptChoice: PromptForClusterChoice,
	confirm: PromptForConfirmation,
	candidates: TabCandyCluster[]
): void {
	const paired = candidates.filter((cluster) => cluster.pairedWith !== null);
	if (paired.length === 0) {
		return;
	}

	/**
	 * Confirms, then unlinks.
	 *
	 * @param id - Id of the Cluster to unlink.
	 */
	const unlinkConfirmed = (id: string): void => {
		const { clusters } = settingsStore.get();
		const cluster = clusters[id];
		if (cluster?.pairedWith === null) {
			return;
		}
		const partner = clusters[cluster.pairedWith];
		if (partner === undefined) {
			return;
		}
		confirm(
			'Unlink clusters',
			`Unlink ${ cluster.name } from ${ partner.name }?`,
			'Unlink',
			() => {
				void unlinkCluster(
					settingsStore,
					id
				);
			}
		);
	};

	if (paired.length === 1) {
		unlinkConfirmed(paired[0].id);
		return;
	}
	promptChoice(
		paired,
		unlinkConfirmed,
		{
			action: 'Unlink',
			title: 'Unlink which cluster?'
		}
	);
}

/**
 * Unlinks a Cluster from its partner and saves. Saves nothing when the Cluster isn't paired.
 *
 * @param settingsStore - Store holding the Clusters.
 * @param id - Id of either Cluster in the Pairing.
 * @returns Whether a Pairing was removed.
 */
export async function unlinkCluster(settingsStore: SettingsStore, id: string): Promise<boolean> {
	const { clusters } = settingsStore.get();
	const next = unpairCluster(
		clusters,
		id
	);
	if (next === clusters) {
		return false;
	}

	const {
		name,
		pairedWith
	} = clusters[id];
	const partner = pairedWith === null ? undefined : clusters[pairedWith];
	await settingsStore.update({ clusters: next });
	new Notice(partner === undefined ? `Unlinked ${ name }.` : `Unlinked ${ name } from ${ partner.name }.`);
	return true;
}