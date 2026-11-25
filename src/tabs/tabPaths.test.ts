/** @file Tests for reading the file paths of tabs and panes. */
import {
	describe,
	expect,
	it
} from 'vitest';
import {
	getActiveTabPath,
	getPanePaths,
	getTabPath
} from './tabPaths';
import {
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	createFakeLeaf,
	makeUnreadable
} from '../test/FakeWorkspaceLeaf';
import {
	addFileTab,
	addNonFileTab
} from '../test/clusterHelpers';

describe('getTabPath', () => {
	it('returns the file path of a file-backed leaf', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'Notes/a.md',
			{}
		);

		const result = getTabPath(leaf);

		expect(result).toBe('Notes/a.md');
	});

	it('returns null for a leaf with no file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(
			app,
			{}
		);

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});

	it('returns null for an empty leaf', () => {
		const app = createFakeWorkspaceApp();
		const leaf = createFakeLeaf(app);

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});

	it('returns null for a leaf whose state cannot be read', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(
			app,
			'a.md',
			{}
		);
		makeUnreadable(leaf);

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});
});

describe('getPanePaths', () => {
	it('returns the file paths of every tab in the leaf\'s pane, in tab order', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(
			app,
			'one.md',
			pane
		);
		const second = await addFileTab(
			app,
			'two.md',
			pane
		);
		await addFileTab(
			app,
			'three.md',
			pane
		);

		const result = getPanePaths(
			app,
			second
		);

		expect(result).toEqual([
			'one.md',
			'two.md',
			'three.md'
		]);
	});

	it('excludes tabs in other panes', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const mine = await addFileTab(
			app,
			'mine.md',
			pane
		);
		await addFileTab(
			app,
			'other.md',
			{}
		);

		const result = getPanePaths(
			app,
			mine
		);

		expect(result).toEqual(['mine.md']);
	});

	it('excludes tabs in the pane that have no file', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const file = await addFileTab(
			app,
			'a.md',
			pane
		);
		await addNonFileTab(
			app,
			pane
		);

		const result = getPanePaths(
			app,
			file
		);

		expect(result).toEqual(['a.md']);
	});

	it('excludes tabs in the pane whose state cannot be read', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const readable = await addFileTab(
			app,
			'a.md',
			pane
		);
		const unreadable = await addFileTab(
			app,
			'b.md',
			pane
		);
		makeUnreadable(unreadable);

		const result = getPanePaths(
			app,
			readable
		);

		expect(result).toEqual(['a.md']);
	});

	it('returns an empty array for a leaf that is not a root leaf', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(
			app,
			'a.md',
			{}
		);
		const stray = createFakeLeaf(app);
		Object.defineProperty(
			stray,
			'parent',
			{
				value: {},
				configurable: true
			}
		);

		const result = getPanePaths(
			app,
			stray
		);

		expect(result).toEqual([]);
	});

	it('returns an empty array when the leaf has no pane', async () => {
		const app = createFakeWorkspaceApp();
		const first = await addFileTab(
			app,
			'a.md',
			{}
		);
		const second = await addFileTab(
			app,
			'b.md',
			{}
		);
		Object.defineProperty(
			first,
			'parent',
			{
				value: undefined,
				configurable: true
			}
		);
		Object.defineProperty(
			second,
			'parent',
			{
				value: undefined,
				configurable: true
			}
		);

		const result = getPanePaths(
			app,
			first
		);

		expect(result).toEqual([]);
	});
});

describe('getActiveTabPath', () => {
	it('returns the file path of the most recent tab', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addFileTab(
				app,
				'a.md',
				{}
			)
		);

		const result = getActiveTabPath(app);

		expect(result).toBe('a.md');
	});

	it('returns null when the most recent tab has no file', async () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			await addNonFileTab(
				app,
				{}
			)
		);

		const result = getActiveTabPath(app);

		expect(result).toBeNull();
	});

	it('returns null when there is no most recent tab', () => {
		const app = createFakeWorkspaceApp();
		setMostRecentLeaf(
			app,
			null
		);

		const result = getActiveTabPath(app);

		expect(result).toBeNull();
	});
});
