/** @file Tests for the choose-a-Cluster command builder. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildChooseClusterCommand } from './chooseClusterCommand';
import { createFakeWorkspaceApp } from '../test/FakeWorkspace';
import {
	buildStoreWith,
	choosing,
	isAvailable
} from '../test/clusterHelpers';
import { buildDependencies } from '../test/dependencyHelpers';
import { buildCluster } from '../test/fakes';
import type { PromptForClusterChoice } from '../types';

describe('buildChooseClusterCommand', () => {
	it('is unavailable when there are no Clusters', () => {
		const command = buildChooseClusterCommand(
			buildDependencies(
				createFakeWorkspaceApp(),
				buildStoreWith()
			),
			{
				id: 'x',
				name: 'X',
				action: 'Go',
				onChoose: () => {}
			}
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('is unavailable when the candidate filter leaves none', () => {
		const command = buildChooseClusterCommand(
			buildDependencies(
				createFakeWorkspaceApp(),
				buildStoreWith(buildCluster())
			),
			{
				id: 'x',
				name: 'X',
				action: 'Go',
				candidates: () => [],
				onChoose: () => {}
			}
		);

		const result = isAvailable(command);

		expect(result).toBe(false);
	});

	it('offers the candidates with the action and title, only when run', () => {
		const offered: string[][] = [];
		const labels: unknown[] = [];
		const prompt: PromptForClusterChoice = (clusters, _onSubmit, options) => {
			offered.push(clusters.map((cluster) => cluster.id));
			labels.push(options);
		};
		const command = buildChooseClusterCommand(
			buildDependencies(
				createFakeWorkspaceApp(),
				buildStoreWith(
					buildCluster({ id: 'one' }),
					buildCluster({ id: 'two' })
				),
				{ promptForClusterChoice: prompt }
			),
			{
				id: 'x',
				name: 'X',
				action: 'Go',
				candidates: (clusters) => clusters.filter((cluster) => cluster.id === 'two'),
				onChoose: () => {}
			}
		);

		isAvailable(command);
		const promptedWhileChecking = offered.length;
		command.checkCallback?.(false);

		expect(promptedWhileChecking).toBe(0);
		expect(offered).toEqual([['two']]);
		expect(labels).toEqual([{
			action: 'Go',
			title: 'X'
		}]);
	});

	it('passes the chosen id and the dependencies to onChoose', () => {
		const onChoose = vi.fn();
		const dependencies = buildDependencies(
			createFakeWorkspaceApp(),
			buildStoreWith(buildCluster({ id: 'one' })),
			{ promptForClusterChoice: choosing('one').prompt }
		);
		const command = buildChooseClusterCommand(
			dependencies,
			{
				id: 'x',
				name: 'X',
				action: 'Go',
				onChoose
			}
		);

		command.checkCallback?.(false);

		expect(onChoose).toHaveBeenCalledWith(
			'one',
			dependencies
		);
	});
});
