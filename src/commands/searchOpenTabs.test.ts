/** @file Tests for the search-open-tabs command. */
import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildInvokeCommand } from './searchOpenTabs';
import { createConfiguredApp } from '../test/fakes';
import SearchOpenTabsModal from '../ui/SearchOpenTabsModal';
import { buildStore } from '../test/fakes';
import { buildDependencies } from '../test/dependencyHelpers';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('search-open-tabs command', () => {
	it('has its id and name', () => {
		const command = buildInvokeCommand(buildDependencies(
			createConfiguredApp({ files: {} }), 
			buildStore()
		));

		expect([
			command.id,
			command.name
		]).toEqual([
			'search-open-tabs',
			'Search open tabs'
		]);
	});

	it('opens the tab search modal', () => {
		const opened: unknown[] = [];
		vi.spyOn(
			SearchOpenTabsModal.prototype,
			'open'
		).mockImplementation(function (this: SearchOpenTabsModal) {
			opened.push(this);
		});

		buildInvokeCommand(buildDependencies(
			createConfiguredApp({ files: {} }), 
			buildStore()
		)).callback?.();

		expect(opened).toHaveLength(1);
		expect(opened[0]).toBeInstanceOf(SearchOpenTabsModal);
	});
});