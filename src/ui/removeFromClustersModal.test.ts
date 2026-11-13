/** @file Tests for the Remove From Clusters modal. */
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import RemoveFromClustersModal from './RemoveFromClustersModal';
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
	modal: RemoveFromClustersModal;
	onSubmit: Mock<(ids: string[]) => void>;
} {
	const onSubmit = vi.fn<(ids: string[]) => void>();
	const modal = new RemoveFromClustersModal(
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
function findButton(modal: RemoveFromClustersModal, label: string): HTMLButtonElement {
	const button = Array.from(modal.contentEl.querySelectorAll('button'))
		.find((candidate) => candidate.textContent === label);
	if (button === undefined) {
		throw new Error(`No "${ label }" button`);
	}
	return button;
}

/**
 * Sets a checkbox.
 *
 * @param modal - The open modal.
 * @param index - Position of the checkbox, in Cluster order.
 * @param checked - The state to set.
 */
function setChecked(modal: RemoveFromClustersModal, index: number, checked: boolean): void {
	const checkbox = modal.contentEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[index];
	if (checkbox === undefined) {
		throw new Error(`No checkbox ${ index }`);
	}
	checkbox.checked = checked;
	checkbox.dispatchEvent(new Event('change'));
}

describe('RemoveFromClustersModal', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows one checkbox per Cluster', () => {
		const { modal } = openModal();

		const count = modal.contentEl.querySelectorAll('input[type="checkbox"]').length;

		expect(count).toBe(2);
	});

	it('submits the ids of the checked Clusters', () => {
		const { modal, onSubmit } = openModal();

		setChecked(modal, 1, true);
		findButton(modal, 'Remove from selected').click();

		expect(onSubmit).toHaveBeenCalledWith(['two']);
	});

	it('submits several checked Clusters', () => {
		const { modal, onSubmit } = openModal();

		setChecked(modal, 0, true);
		setChecked(modal, 1, true);
		findButton(modal, 'Remove from selected').click();

		expect(onSubmit).toHaveBeenCalledWith(['one', 'two']);
	});

	it('leaves out a Cluster that was checked and then unchecked', () => {
		const { modal, onSubmit } = openModal();

		setChecked(modal, 0, true);
		setChecked(modal, 0, false);
		setChecked(modal, 1, true);
		findButton(modal, 'Remove from selected').click();

		expect(onSubmit).toHaveBeenCalledWith(['two']);
	});

	it('does not submit when none are checked', () => {
		const { modal, onSubmit } = openModal();

		findButton(modal, 'Remove from selected').click();

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not submit when cancelled', () => {
		const { modal, onSubmit } = openModal();

		setChecked(modal, 0, true);
		findButton(modal, 'Cancel').click();

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('empties its content when closed', () => {
		const { modal } = openModal();

		findButton(modal, 'Cancel').click();

		expect(modal.contentEl.childElementCount).toBe(0);
	});
});