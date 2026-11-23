/** @file Suggests vault files, fuzzy-matched, under a text input. */
import {
	AbstractInputSuggest,
	App,
	TFile,
	prepareFuzzySearch
} from 'obsidian';

/** Offers the vault's files under an input and reports the one picked. */
export default class FileInputSuggest extends AbstractInputSuggest<TFile> {
	_onPick: (file: TFile) => void;

	/**
	 * @param app - The Obsidian app.
	 * @param inputEl - The input to suggest under.
	 * @param onPick - Called with the file the user picks.
	 */
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		onPick: (file: TFile) => void
	) {
		super(
			app,
			inputEl
		);
		this._onPick = onPick;
	}

	/**
	 * @param query - What the user has typed.
	 * @returns Up to twenty files whose paths fuzzy-match the query, best first.
	 */
	getSuggestions(query: string): TFile[] {
		const search = prepareFuzzySearch(query);
		const scored: {
			file: TFile;
			score: number
		}[] = [];
		for (const file of this.app.vault.getFiles()) {
			const match = search(file.path);
			if (match) {
				scored.push({
					file,
					score: match.score
				});
			}
		}

		return scored
			.sort((
				a,
				b
			) => b.score - a.score)
			.slice(0, 20)
			.map(({ file }) => file);
	}

	/**
	 * @param file - The suggested file.
	 * @param el - The element to render it into.
	 */
	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	/**
	 * Fills the input with the file's path, closes the list and reports the pick.
	 *
	 * @param file - The picked file.
	 */
	selectSuggestion(file: TFile): void {
		this.setValue(file.path);
		this.close();
		this._onPick(file);
	}
}