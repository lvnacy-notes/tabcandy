/** @file Tests for the Pair clusters modal. */
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import PairClustersModal from './PairClustersModal';
import {
	buildCluster,
	createConfiguredApp
} from '../test/fakes';
import { findButton } from '../test/modalHelpers';

/**
 * Opens a modal over three Clusters whose submissions are recorded.
 *
 * @returns The modal and the spy receiving submitted ids.
 */
function openModal(): {
	modal: PairClustersModal;
	onSubmit: Mock<(
		sourceId: string,
		targetId: string
	) => void>;
} {
	const onSubmit = vi.fn<(
		sourceId: string,
		targetId: string
	) => void>();
	const modal = new PairClustersModal(
		createConfiguredApp(),
		[
			buildCluster({
				id: 'one',
				name: 'One'
			}),
			buildCluster({
				id: 'two',
				name: 'Two'
			}),
			buildCluster({
				id: 'three',
				name: 'Three'
			}),
		],
		onSubmit
	);
	modal.open();
	return {
		modal,
		onSubmit
	};
}

/**
 * Picks a Cluster in one of the dropdowns.
 *
 * @param modal - The open modal.
 * @param index - Position of the dropdown: 0 for the source, 1 for the target.
 * @param id - Id of the Cluster to pick.
 */
function pick(modal: PairClustersModal, index: number, id: string): void {
	const select = modal.contentEl.querySelectorAll('select')[index];
	select.value = id;
	select.dispatchEvent(new Event('change'));
}

/**
 * Reads the option labels of one dropdown.
 *
 * @param modal - The open modal.
 * @param index - Position of the dropdown.
 * @returns The labels.
 */
function optionsOf(modal: PairClustersModal, index: number): (string | null)[] {
	return Array.from(modal.contentEl.querySelectorAll('select')[index].querySelectorAll('option'))
		.map((option) => option.textContent);
}

describe('PairClustersModal', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lists every Cluster as a source', () => {
		const { modal } = openModal();

		expect(optionsOf(
			modal,
			0
		)).toEqual([
			'One',
			'Two',
			'Three'
		]);
	});

	it('leaves the source out of the targets', () => {
		const { modal } = openModal();

		expect(optionsOf(
			modal,
			1
		)).toEqual([
			'Two',
			'Three'
		]);
	});

	it('rebuilds the targets when the source changes', () => {
		const { modal } = openModal();

		pick(
			modal,
			0,
			'two'
		);

		expect(optionsOf(
			modal,
			1
		)).toEqual([
			'One',
			'Three'
		]);
	});

	it('submits the first source and the first target when nothing is picked', () => {
		const {
			modal,
			onSubmit
		} = openModal();

		findButton(
			modal,
			'Pair'
		).click();

		expect(onSubmit).toHaveBeenCalledWith(
			'one',
			'two'
		);
	});

	it('submits the picked source and target', () => {
		const {
			modal,
			onSubmit
		} = openModal();

		pick(
			modal,
			0,
			'two'
		);
		pick(
			modal,
			1,
			'three'
		);
		findButton(
			modal,
			'Pair'
		).click();

		expect(onSubmit).toHaveBeenCalledWith(
			'two',
			'three'
		);
	});

	it('submits the first remaining target after the source changes', () => {
		const {
			modal,
			onSubmit
		} = openModal();

		pick(
			modal,
			0,
			'two'
		);
		findButton(
			modal,
			'Pair'
		).click();

		expect(onSubmit).toHaveBeenCalledWith(
			'two',
			'one'
		);
	});

	it('does not submit when cancelled', () => {
		const {
			modal,
			onSubmit
		} = openModal();

		findButton(
			modal,
			'Cancel'
		).click();

		expect(onSubmit).not.toHaveBeenCalled();
	});
});