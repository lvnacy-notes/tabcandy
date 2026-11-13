/** @file Tests for the Choose Cluster modal. */
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import ChooseClusterModal from './ChooseClusterModal';
import {
	buildCluster,
	createConfiguredApp
} from '../test/fakes';

/**
 * Opens a modal over two Clusters whose submissions are recorded.
 *
 * @returns The modal and the spy receiving submitted ids.
 */
function openModal(): {
	modal: ChooseClusterModal;
	onSubmit: Mock<(id: string) => void>;
} {
	const onSubmit = vi.fn<(id: string) => void>();
	const modal = new ChooseClusterModal(
		createConfiguredApp(),
		[
			buildCluster({ id: 'one', name: 'One' }),
			buildCluster({ id: 'two', name: 'Two' }),
		],
		onSubmit
	);
	modal.open();
	return { modal, onSubmit };
}

/**
 * Finds a button by its label.
 *
 * @param modal - The open modal.
 * @param label - The button text.
 * @returns The button.
 */
function findButton(modal: ChooseClusterModal, label: string): HTMLButtonElement {
	const button = Array.from(modal.contentEl.querySelectorAll('button'))
		.find((candidate) => candidate.textContent === label);
	if (button === undefined) {
		throw new Error(`No "${ label }" button`);
	}
	return button;
}

/**
 * Picks a Cluster in the dropdown.
 *
 * @param modal - The open modal.
 * @param id - Id of the Cluster to pick.
 */
function pick(modal: ChooseClusterModal, id: string): void {
	const select = modal.contentEl.querySelector('select');
	if (select === null) {
		throw new Error('No dropdown');
	}
	select.value = id;
	select.dispatchEvent(new Event('change'));
}

describe('ChooseClusterModal', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lists every Cluster by name', () => {
		const { modal } = openModal();

		const options = Array.from(modal.contentEl.querySelectorAll('option'))
			.map((option) => option.textContent);

		expect(options).toEqual(['One', 'Two']);
	});

	it('submits the first Cluster when nothing is picked', () => {
		const { modal, onSubmit } = openModal();

		findButton(modal, 'Add').click();

		expect(onSubmit).toHaveBeenCalledWith('one');
	});

	it('submits the picked Cluster', () => {
		const { modal, onSubmit } = openModal();

		pick(modal, 'two');
		findButton(modal, 'Add').click();

		expect(onSubmit).toHaveBeenCalledWith('two');
	});

	it('does not submit when cancelled', () => {
		const { modal, onSubmit } = openModal();

		findButton(modal, 'Cancel').click();

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('empties its content when closed', () => {
		const { modal } = openModal();

		findButton(modal, 'Cancel').click();

		expect(modal.contentEl.childElementCount).toBe(0);
	});
});