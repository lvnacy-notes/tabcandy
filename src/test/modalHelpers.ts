/** @file Helpers shared by the modal tests. */
import { Modal } from 'obsidian';

/**
 * Finds a button in a modal's content by its label.
 *
 * @param modal - The open modal.
 * @param label - The button text.
 * @returns The button.
 */
export function findButton(modal: Modal, label: string): HTMLButtonElement {
	const button = Array.from(modal.contentEl.querySelectorAll('button'))
		.find((candidate) => candidate.textContent === label);
	if (button === undefined) {
		throw new Error(`No "${ label }" button`);
	}
	return button;
}