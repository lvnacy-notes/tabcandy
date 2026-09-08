import TabCandyPlugin from '../../../main';
import {
	Modal,
	Notice,
	Setting,
	TFile
} from 'obsidian';
import ConfirmModal from './ConfirmModal';
import ChooseFolderModal from './ChooseFolderModal';
import ChooseMarkdownFileModal from './ChooseMarkdownFileModal';
import {
	parseQuoteBlockquotes,
	serializeQuotesAsBlockquotes,
} from '../../services/quotes';
import { CustomQuote } from '../../types';

/** Filename Export writes to (within whatever folder is picked). */
const EXPORT_FILE_NAME = 'Tab Candy Quotes.md';

export default class CustomQuotesModal extends Modal {
	_onSave: (customQuotes: CustomQuote[]) => void;
	_plugin: TabCandyPlugin;
	_customQuotes: CustomQuote[];

	constructor(
		plugin: TabCandyPlugin,
		onSave: (customQuotes: CustomQuote[]) => void
	) {
		super(plugin.app);
		this._plugin = plugin;
		this._onSave = onSave;
		// Deep clone via round-tripping through JSON, so edits made in this
		// modal don't mutate the settings object until Save is clicked.
		this._customQuotes = JSON.parse(
			JSON.stringify(this._plugin.settings.customQuotes)
		) as CustomQuote[];
	}

	onOpen() {
		this.display();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	display(): void {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl('h2', { text: 'Custom quotes' });

		const table = contentEl.createEl('table', { cls: 'tabcandy-customquotes-table' });
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th');
		headerRow.createEl('th', { text: 'Text' });
		headerRow.createEl('th', { text: 'Author' });
		const tbody = table.createEl('tbody');

		this._customQuotes.forEach((customQuote, index) => {
			const tableRow = tbody.createEl('tr');

			const actionCell = tableRow.createEl('td');
			const removeButton = actionCell.createEl('button', {
				text: 'Remove',
				cls: 'mod-warning',
			});
			removeButton.addEventListener('click', () => {
				new ConfirmModal(
					this.app,
					() => {
						this._customQuotes.splice(index, 1);
						this.display();
					},
					'Remove quote',
					`Are you sure?`,
					'Remove'
				).open();
			});

			const textCell = tableRow.createEl('td');
			const quoteTextInput = textCell.createEl('textarea', {
				text: customQuote.text,
			});
			quoteTextInput.addEventListener('change', (e: Event) => {
				this._customQuotes[index].text = (
					e.target as HTMLTextAreaElement
				).value;
			});

			const authorCell = tableRow.createEl('td');
			const quoteAuthorInput = authorCell.createEl('input', {
				type: 'text',
				value: customQuote.author,
			});
			quoteAuthorInput.addEventListener('change', (e: Event) => {
				this._customQuotes[index].author = (
					e.target as HTMLInputElement
				).value;
			});
		});

		new Setting(contentEl).addButton((component) => {
			component.setButtonText('Add new quote').onClick(() => {
				this._customQuotes.push({
					text: '',
					author: '',
				});
				this.display();
			});
		});

		new Setting(contentEl)
			.setName('Import / export')
			.setDesc(
				'Export writes the list above to a new markdown note, in ' +
				'the same blockquote format as the quotes file setting. ' +
				'Import reads quotes back out of an existing note in that ' +
				'same format and adds them to the list above - it does ' +
				'not overwrite anything already there, and nothing is ' +
				'saved until you click Save below.'
			)
			.addButton((component) => {
				component.setButtonText('Export to note').onClick(() => {
					new ChooseFolderModal(this.app, (folder) => {
						void this.exportQuotes(folder.path);
					}).open();
				});
			})
			.addButton((component) => {
				component.setButtonText('Import from note').onClick(() => {
					new ChooseMarkdownFileModal(this.app, (file) => {
						void this.importQuotes(file);
					}).open();
				});
			});

		new Setting(contentEl).addButton((component) => {
			component.setButtonText('Save');

			component.setCta().onClick(() => {
				this._onSave(this._customQuotes);
				this.close();
			});
		});
	}

	/**
	 * Writes the in-progress quote list (including unsaved edits made in
	 * this modal) to a new note in the chosen folder, serialized as
	 * blockquotes - the same format the quotes-file setting reads, so
	 * an exported note can be pointed at directly as someone's
	 * quotesFilePath, shared, or re-imported with the button next to
	 * this one.
	 */
	private async exportQuotes(folderPath: string): Promise<void> {
		const path = folderPath ? `${folderPath}/${EXPORT_FILE_NAME}` : EXPORT_FILE_NAME;
		const content = serializeQuotesAsBlockquotes(this._customQuotes);
		const existingFile = this.app.vault.getAbstractFileByPath(path);

		const write = async () => {
			try {
				if (existingFile instanceof TFile) {
					await this.app.vault.modify(existingFile, content);
				} else {
					await this.app.vault.create(path, content);
				}
				new Notice(
					`Tab Candy: exported ${this._customQuotes.length} quote(s) to "${path}".`
				);
			} catch (error) {
				console.error('Tab Candy: failed to export quotes', error);
				new Notice(`Tab Candy: could not write to "${path}".`);
			}
		};

		if (existingFile) {
			new ConfirmModal(
				this.app,
				() => {
					void write();
				},
				'Overwrite existing file?',
				`"${path}" already exists. Overwrite it with the exported quotes?`,
				'Overwrite'
			).open();
			return;
		}

		await write();
	}

	/**
	 * Reads an existing note and parses it with the same
	 * parseQuoteBlockquotes used for the quotes-file setting, then
	 * appends whatever quotes it finds to the in-progress list (still
	 * unsaved until Save is clicked). A note with no parseable
	 * blockquotes is a normal, expected outcome - not an error - so it
	 * gets a plain heads-up Notice rather than treatment as a failure.
	 */
	private async importQuotes(file: TFile): Promise<void> {
		let raw: string;
		try {
			raw = await this.app.vault.read(file);
		} catch (error) {
			console.error('Tab Candy: failed to read quotes file for import', error);
			new Notice(`Tab Candy: could not read "${file.path}".`);
			return;
		}

		const parsedQuotes = parseQuoteBlockquotes(raw);

		if (parsedQuotes.length === 0) {
			new Notice(`Tab Candy: no quotes found in "${file.path}".`);
			return;
		}

		this._customQuotes.push(...parsedQuotes);
		new Notice(`Tab Candy: imported ${parsedQuotes.length} quote(s).`);
		this.display();
	}
}