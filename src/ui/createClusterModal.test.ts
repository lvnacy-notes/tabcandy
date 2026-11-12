/** @file Tests for the Create Cluster modal. */
import {
	type Mock,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import CreateClusterModal from './CreateClusterModal';
import { createConfiguredApp } from '../test/fakes';
import type { ClusterDraft } from '../types';

/**
 * Opens a modal whose submissions are recorded.
 *
 * @returns The modal and the spy receiving submitted drafts.
 */
function openModal(): {
	modal: CreateClusterModal;
	onSubmit: Mock<(draft: ClusterDraft) => void>;
} {
	const onSubmit = vi.fn<(draft: ClusterDraft) => void>();
	const modal = new CreateClusterModal(createConfiguredApp(), onSubmit);
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
function findButton(modal: CreateClusterModal, label: string): HTMLButtonElement {
	const button = Array.from(modal.contentEl.querySelectorAll('button'))
		.find((candidate) => candidate.textContent === label);
	if (button === undefined) {
		throw new Error(`No "${ label }" button`);
	}
	return button;
}

/**
 * Types into the name field.
 *
 * @param modal - The open modal.
 * @param value - The text to enter.
 * @returns The name field.
 */
function typeName(modal: CreateClusterModal, value: string): HTMLInputElement {
	const input = modal.contentEl.querySelector<HTMLInputElement>('input[type="text"], input:not([type])');
	if (input === null) {
		throw new Error('No name field');
	}
	input.value = value;
	input.dispatchEvent(new Event('input'));
	return input;
}

/**
 * Picks a color in the Flavor swatch.
 *
 * @param modal - The open modal.
 * @param color - Hex color.
 */
function pickColor(modal: CreateClusterModal, color: string): void {
	const swatch = modal.contentEl.querySelector<HTMLInputElement>('input[type="color"]');
	if (swatch === null) {
		throw new Error('No Flavor swatch');
	}
	swatch.value = color;
	swatch.dispatchEvent(new Event('change'));
}

/**
 * Clicks the Flavor reset button.
 *
 * @param modal - The open modal.
 */
function clearColor(modal: CreateClusterModal): void {
	const reset = modal.contentEl.querySelector<HTMLElement>('.extra-setting-button');
	if (reset === null) {
		throw new Error('No reset button');
	}
	reset.click();
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('CreateClusterModal', () => {
	it('submits a blank name and no Flavor when nothing is entered', () => {
		const { modal, onSubmit } = openModal();

		findButton(modal, 'Create').click();

		expect(onSubmit).toHaveBeenCalledWith({
			name: '',
			flavor: undefined,
		});
	});

	it('submits the entered name with surrounding whitespace trimmed', () => {
		const { modal, onSubmit } = openModal();

		typeName(modal, '  Reading list  ');
		findButton(modal, 'Create').click();

		expect(onSubmit).toHaveBeenCalledWith({
			name: 'Reading list',
			flavor: undefined,
		});
	});

	it('submits the picked Flavor', () => {
		const { modal, onSubmit } = openModal();

		pickColor(modal, '#ff0000');
		findButton(modal, 'Create').click();

		expect(onSubmit).toHaveBeenCalledWith({
			name: '',
			flavor: '#ff0000',
		});
	});

	it('submits no Flavor after the picked color is cleared', () => {
		const { modal, onSubmit } = openModal();

		pickColor(modal, '#ff0000');
		clearColor(modal);
		findButton(modal, 'Create').click();

		expect(onSubmit).toHaveBeenCalledWith({
			name: '',
			flavor: undefined,
		});
	});

	it('submits when Enter is pressed in the name field', () => {
		const { modal, onSubmit } = openModal();

		const input = typeName(modal, 'Reading');
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

		expect(onSubmit).toHaveBeenCalledWith({
			name: 'Reading',
			flavor: undefined,
		});
	});

	it('does not submit when Enter confirms an IME composition', () => {
		const { modal, onSubmit } = openModal();

		const input = typeName(modal, 'Reading');
		input.dispatchEvent(new KeyboardEvent('keydown', {
			key: 'Enter',
			isComposing: true,
		}));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not submit on other keys', () => {
		const { modal, onSubmit } = openModal();

		const input = typeName(modal, 'Reading');
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not submit when cancelled', () => {
		const { modal, onSubmit } = openModal();

		typeName(modal, 'Reading');
		findButton(modal, 'Cancel').click();

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('empties its content when closed', () => {
		const { modal } = openModal();

		findButton(modal, 'Cancel').click();

		expect(modal.contentEl.childElementCount).toBe(0);
	});

	it('empties its content after submitting', () => {
		const { modal } = openModal();

		findButton(modal, 'Create').click();

		expect(modal.contentEl.childElementCount).toBe(0);
	});
});