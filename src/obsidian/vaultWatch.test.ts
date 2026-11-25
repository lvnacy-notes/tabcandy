/** @file Tests for the vault watcher skeleton. */
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { watchVault } from './vaultWatch';
import { createConfiguredApp } from '../test/fakes';

describe('watchVault', () => {
	it('registers nothing when given no handlers', () => {
		const registerEvent = vi.fn();

		watchVault(
			createConfiguredApp(),
			registerEvent,
			{}
		);

		expect(registerEvent).not.toHaveBeenCalled();
	});

	it('registers create and modify for onChange, one listener each for the rest', () => {
		const registerEvent = vi.fn();

		watchVault(
			createConfiguredApp(),
			registerEvent,
			{
				onChange: () => {},
				onDelete: () => {},
				onRename: () => {}
			}
		);

		expect(registerEvent).toHaveBeenCalledTimes(4);
	});

	it('calls each handler for its event', () => {
		const app = createConfiguredApp();
		const calls: string[] = [];
		watchVault(
			app,
			() => {},
			{
				onChange: (file) => calls.push(`change ${ file.path }`),
				onDelete: (file) => calls.push(`delete ${ file.path }`),
				onRename: (
					file, 
					oldPath
				) => calls.push(`rename ${ oldPath } to ${ file.path }`)
			}
		);
		const file = { path: 'a.md' };

		app.vault.trigger(
			'create',
			file
		);
		app.vault.trigger(
			'modify',
			file
		);
		app.vault.trigger(
			'delete',
			file
		);
		app.vault.trigger(
			'rename',
			file,
			'old.md'
		);

		expect(calls).toEqual([
			'change a.md',
			'change a.md',
			'delete a.md',
			'rename old.md to a.md'
		]);
	});
});
