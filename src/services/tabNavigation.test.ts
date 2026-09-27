import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { ViewState, WorkspaceLeaf } from 'obsidian';
import {
	CLOSED_TABS_LIMIT,
	TAB_CANDY_VIEW_TYPE,
	ClosedTabEntry,
	TabRecord,
} from '../types';
import {
	addRootLeaf,
	addSidebarLeaf,
	createFakeWorkspaceApp,
	setLayoutReady,
	setMostRecentLeaf,
} from '../test/FakeWorkspace';
import {
	createFakeLeaf,
	makeUnreadable,
	setDisplayText,
} from '../test/FakeWorkspaceLeaf';
import {
	closeDuplicateTabs,
	closeLeaves,
	closeOtherTabs,
	closeTabsInFolder,
	focusOpenLeaf,
	getAdjacentLeaf,
	getClosedTabs,
	getViewStateFilePath,
	goToAdjacentTab,
	isUnderFolder,
	planDuplicateClosures,
	pushClosedTab,
	registerTabTracking,
	removeClosedTab,
	reopenClosedTab,
	reopenLastClosedTab,
	resetTabTrackingState,
	toTabRecord,
} from './tabNavigation';

beforeEach(() => {
	resetTabTrackingState();
});

function collectRootLeaves(app: ReturnType<typeof createFakeWorkspaceApp>): WorkspaceLeaf[] {
	const leaves: WorkspaceLeaf[] = [];
	app.workspace.iterateRootLeaves((leaf) => leaves.push(leaf));
	return leaves;
}

function collectAllLeaves(app: ReturnType<typeof createFakeWorkspaceApp>): WorkspaceLeaf[] {
	const leaves: WorkspaceLeaf[] = [];
	app.workspace.iterateAllLeaves((leaf) => leaves.push(leaf));
	return leaves;
}

describe('getViewStateFilePath', () => {
	it('returns the path for a string state.file', () => {
		expect(
			getViewStateFilePath({ type: 'markdown', state: { file: 'Notes/a.md' } })
		).toBe('Notes/a.md');
	});

	it('returns null for a non-string state.file', () => {
		expect(
			getViewStateFilePath({ type: 'markdown', state: { file: 42 } })
		).toBeNull();
	});

	it('returns null when there is no state at all', () => {
		expect(getViewStateFilePath({ type: 'empty' })).toBeNull();
	});
});

describe('isUnderFolder', () => {
	it('matches when the file path exactly equals the folder path, before any mode-specific check', () => {
		expect(isUnderFolder('Projects', 'Projects', false)).toBe(true);
	});

	it('recursive: matches a file nested below the folder', () => {
		expect(isUnderFolder('Projects/2024/a.md', 'Projects', true)).toBe(true);
	});

	it('recursive: does not match a sibling folder that shares a prefix', () => {
		expect(
			isUnderFolder('Projects/2024-Archive/a.md', 'Projects/2024', true)
		).toBe(false);
	});

	it('non-recursive: matches a file directly inside the folder', () => {
		expect(isUnderFolder('Projects/a.md', 'Projects', false)).toBe(true);
	});

	it('non-recursive: does not match a file nested deeper than a direct child', () => {
		expect(isUnderFolder('Projects/2024/a.md', 'Projects', false)).toBe(false);
	});

	it('non-recursive: does not match a sibling folder that shares a prefix', () => {
		expect(isUnderFolder('Projects-Archive/a.md', 'Projects', false)).toBe(false);
	});

	it('vault root, recursive: matches a nested file', () => {
		expect(isUnderFolder('Projects/a.md', '', true)).toBe(true);
	});

	it('vault root, non-recursive: matches a root-level file but not a nested one', () => {
		expect(isUnderFolder('a.md', '', false)).toBe(true);
		expect(isUnderFolder('Projects/a.md', '', false)).toBe(false);
	});
});

describe('closeLeaves', () => {
	it('closes exactly the leaves the predicate selects', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const keep = createFakeLeaf(app);
		await keep.setViewState({ type: 'markdown', state: { file: 'Keep.md' } });
		addRootLeaf(app, keep);
		const close = createFakeLeaf(app);
		await close.setViewState({ type: 'markdown', state: { file: 'Close.md' } });
		addRootLeaf(app, close);

		closeLeaves(app, (leaf) => leaf === close, true);

		expect(collectRootLeaves(app)).toEqual([keep]);
	});

	it('never closes a pinned leaf even when selected', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const pinned = createFakeLeaf(app);
		await pinned.setViewState({
			type: 'markdown',
			state: { file: 'Pinned.md' },
			pinned: true,
		});
		addRootLeaf(app, pinned);

		closeLeaves(app, () => true, true);

		expect(collectRootLeaves(app)).toEqual([pinned]);
	});

	it('never closes a leaf whose getViewState() throws even when selected', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const broken = createFakeLeaf(app);
		makeUnreadable(broken);
		addRootLeaf(app, broken);

		closeLeaves(app, () => true, true);

		expect(collectRootLeaves(app)).toEqual([broken]);
	});

	it('leaves a sidebar leaf untouched even when selected', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const sidebar = createFakeLeaf(app);
		addSidebarLeaf(app, sidebar);

		closeLeaves(app, () => true, true);

		expect(collectAllLeaves(app)).toEqual([sidebar]);
	});

	it('records a closed leaf in the ring, once layout-change fires, when remember is true', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs()).toHaveLength(1);
	});

	it('does not record a closed leaf in the ring when remember is false', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, () => true, false);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs()).toEqual([]);
	});
});

describe('closeOtherTabs', () => {
	it('does nothing when there is no resolved current leaf', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const other = createFakeLeaf(app);
		addRootLeaf(app, other);
		setMostRecentLeaf(app, null);

		closeOtherTabs(app);

		expect(collectRootLeaves(app)).toEqual([other]);
	});

	it('does nothing when the resolved leaf is not among the root leaves', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const rootLeaf = createFakeLeaf(app);
		addRootLeaf(app, rootLeaf);
		const sidebarLeaf = createFakeLeaf(app);
		addSidebarLeaf(app, sidebarLeaf);
		setMostRecentLeaf(app, sidebarLeaf);

		closeOtherTabs(app);

		expect(collectRootLeaves(app)).toEqual([rootLeaf]);
	});

	it('closes every root leaf except the resolved one', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const current = createFakeLeaf(app);
		addRootLeaf(app, current);
		const other = createFakeLeaf(app);
		addRootLeaf(app, other);
		setMostRecentLeaf(app, current);

		closeOtherTabs(app);

		expect(collectRootLeaves(app)).toEqual([current]);
	});
});

describe('getAdjacentLeaf', () => {
	it('returns the next element for a middle leaf going forward', () => {
		expect(getAdjacentLeaf(['a', 'b', 'c'], 'b', 1)).toBe('c');
	});

	it('returns the previous element for a middle leaf going backward', () => {
		expect(getAdjacentLeaf(['a', 'b', 'c'], 'b', -1)).toBe('a');
	});

	it('wraps from the last element to the first going forward', () => {
		expect(getAdjacentLeaf(['a', 'b', 'c'], 'c', 1)).toBe('a');
	});

	it('wraps from the first element to the last going backward', () => {
		expect(getAdjacentLeaf(['a', 'b', 'c'], 'a', -1)).toBe('c');
	});

	it('returns null when there is only one element to cycle within', () => {
		expect(getAdjacentLeaf(['a'], 'a', 1)).toBeNull();
	});

	it('returns null when the current element is not in the list', () => {
		expect(getAdjacentLeaf(['a', 'b', 'c'], 'z', 1)).toBeNull();
	});
});

describe('goToAdjacentTab', () => {
	it('does nothing when there is no resolved current leaf', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const other = createFakeLeaf(app);
		addRootLeaf(app, other);
		setMostRecentLeaf(app, null);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		goToAdjacentTab(app, 1);

		expect(setActiveLeaf).not.toHaveBeenCalled();
	});

	it('does nothing when the resolved leaf is not among the root leaves', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const rootLeaf = createFakeLeaf(app);
		addRootLeaf(app, rootLeaf);
		const sidebarLeaf = createFakeLeaf(app);
		addSidebarLeaf(app, sidebarLeaf);
		setMostRecentLeaf(app, sidebarLeaf);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		goToAdjacentTab(app, 1);

		expect(setActiveLeaf).not.toHaveBeenCalled();
	});

	it('focuses the next root leaf, wrapping past the end', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const first = createFakeLeaf(app);
		addRootLeaf(app, first);
		const second = createFakeLeaf(app);
		addRootLeaf(app, second);
		setMostRecentLeaf(app, second);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		goToAdjacentTab(app, 1);

		expect(setActiveLeaf).toHaveBeenCalledWith(first, { focus: true });
	});

	it('focuses the previous root leaf, wrapping past the start', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const first = createFakeLeaf(app);
		addRootLeaf(app, first);
		const second = createFakeLeaf(app);
		addRootLeaf(app, second);
		setMostRecentLeaf(app, first);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		goToAdjacentTab(app, -1);

		expect(setActiveLeaf).toHaveBeenCalledWith(second, { focus: true });
	});
});

describe('focusOpenLeaf', () => {
	it('finds a match, focuses it, and returns true', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const host = createFakeLeaf(app);
		addRootLeaf(app, host);
		const target = createFakeLeaf(app);
		await target.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, target);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		const result = focusOpenLeaf(app, 'A.md', host);

		expect(result).toBe(true);
		expect(setActiveLeaf).toHaveBeenCalledWith(target, { focus: true });
	});

	it('activates nothing and returns false when no root leaf has the path', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const host = createFakeLeaf(app);
		addRootLeaf(app, host);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		const result = focusOpenLeaf(app, 'A.md', host);

		expect(result).toBe(false);
		expect(setActiveLeaf).not.toHaveBeenCalled();
	});

	it('skips the host leaf even when it has the same path', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const host = createFakeLeaf(app);
		await host.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, host);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		const result = focusOpenLeaf(app, 'A.md', host);

		expect(result).toBe(false);
		expect(setActiveLeaf).not.toHaveBeenCalled();
	});

	it('never matches a leaf whose state cannot be read', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const host = createFakeLeaf(app);
		addRootLeaf(app, host);
		const broken = createFakeLeaf(app);
		makeUnreadable(broken);
		addRootLeaf(app, broken);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		const result = focusOpenLeaf(app, 'A.md', host);

		expect(result).toBe(false);
		expect(setActiveLeaf).not.toHaveBeenCalled();
	});

	it('picks the first match when several leaves have the path', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const host = createFakeLeaf(app);
		addRootLeaf(app, host);
		const first = createFakeLeaf(app);
		await first.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, first);
		const second = createFakeLeaf(app);
		await second.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, second);
		const setActiveLeaf = vi.spyOn(app.workspace, 'setActiveLeaf');

		const result = focusOpenLeaf(app, 'A.md', host);

		expect(result).toBe(true);
		expect(setActiveLeaf).toHaveBeenCalledWith(first, { focus: true });
	});
});

describe('closeTabsInFolder', () => {
	it('non-recursive: closes a leaf directly inside the folder and leaves one with no file path open', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const inFolder = createFakeLeaf(app);
		await inFolder.setViewState({
			type: 'markdown',
			state: { file: 'Projects/a.md' },
		});
		addRootLeaf(app, inFolder);
		const noFile = createFakeLeaf(app);
		addRootLeaf(app, noFile);

		closeTabsInFolder(app, 'Projects', false);

		expect(collectRootLeaves(app)).toEqual([noFile]);
	});

	it('recursive: also closes a leaf nested in a subfolder', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const nested = createFakeLeaf(app);
		await nested.setViewState({
			type: 'markdown',
			state: { file: 'Projects/2024/a.md' },
		});
		addRootLeaf(app, nested);

		closeTabsInFolder(app, 'Projects', true);

		expect(collectRootLeaves(app)).toEqual([]);
	});
});

describe('planDuplicateClosures', () => {
	function record(overrides: Partial<TabRecord> = {}): TabRecord {
		return {
			leaf: {} as unknown as WorkspaceLeaf,
			key: null,
			isProtected: false,
			...overrides,
		};
	}

	it('closes nothing when there are no duplicates', () => {
		const a = record({ key: 'a' });
		const b = record({ key: 'b' });

		expect(planDuplicateClosures([a, b], null)).toEqual({
			close: [],
			reveal: null,
		});
	});

	it('never lets a leaf with a null key participate', () => {
		const a = record({ key: null });
		const b = record({ key: null });

		expect(planDuplicateClosures([a, b], null)).toEqual({
			close: [],
			reveal: null,
		});
	});

	it('keeps the first leaf in order when there is no protected copy and the current leaf is outside the set', () => {
		const first = record({ key: 'dup' });
		const second = record({ key: 'dup' });

		const plan = planDuplicateClosures([first, second], null);

		expect(plan).toEqual({ close: [second.leaf], reveal: null });
	});

	it('keeps the current leaf instead of the first when it is in the set, revealing nothing since nothing had to move', () => {
		const first = record({ key: 'dup' });
		const second = record({ key: 'dup' });

		const plan = planDuplicateClosures([first, second], second.leaf);

		expect(plan).toEqual({ close: [first.leaf], reveal: null });
	});

	it('keeps a protected copy, closes every unprotected copy, and reveals the survivor when the current leaf was closed', () => {
		const protectedRecord = record({ key: 'dup', isProtected: true });
		const current = record({ key: 'dup' });

		const plan = planDuplicateClosures([protectedRecord, current], current.leaf);

		expect(plan).toEqual({
			close: [current.leaf],
			reveal: protectedRecord.leaf,
		});
	});

	it('keeps both copies when two in the same set are protected', () => {
		const first = record({ key: 'dup', isProtected: true });
		const second = record({ key: 'dup', isProtected: true });

		expect(planDuplicateClosures([first, second], null)).toEqual({
			close: [],
			reveal: null,
		});
	});

	it('does not treat the same path under two different view types as a duplicate set', () => {
		const markdown = record({ key: JSON.stringify(['markdown', 'Notes/a.md']) });
		const canvas = record({ key: JSON.stringify(['canvas', 'Notes/a.md']) });

		expect(planDuplicateClosures([markdown, canvas], null)).toEqual({
			close: [],
			reveal: null,
		});
	});
});

describe('toTabRecord', () => {
	it('marks a pinned leaf as protected', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			pinned: true,
		});

		expect(toTabRecord(leaf).isProtected).toBe(true);
	});

	it('marks a leaf with a group as protected', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		const peer = createFakeLeaf(app);
		await leaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			group: peer,
		});

		expect(toTabRecord(leaf).isProtected).toBe(true);
	});

	it('does not protect a leaf whose group is explicitly null', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		// Real obsidian's ViewState.group is typed `WorkspaceLeaf | undefined`,
		// with no `null`, even though a leaf can report `null` for it at
		// runtime. The cast lets this test construct that state anyway.
		await leaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			group: null,
		} as unknown as ViewState);

		const record = toTabRecord(leaf);
		expect(record.isProtected).toBe(false);
		expect(record.key).toBe(JSON.stringify(['markdown', 'A.md']));
	});

	it('builds a normal key for a plain leaf', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });

		expect(toTabRecord(leaf)).toEqual({
			leaf,
			key: JSON.stringify(['markdown', 'A.md']),
			isProtected: false,
		});
	});

	it('builds a null key for a readable leaf with no file path', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app); // never given content -> reports 'empty', no file

		expect(toTabRecord(leaf)).toEqual({ leaf, key: null, isProtected: false });
	});

	it('protects a leaf whose state cannot be read, with a null key', () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		makeUnreadable(leaf);

		expect(toTabRecord(leaf)).toEqual({ leaf, key: null, isProtected: true });
	});
});

describe('closeDuplicateTabs', () => {
	it('detaches the planned leaves and reveals the survivor when the current leaf was among them', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const protectedLeaf = createFakeLeaf(app);
		await protectedLeaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			pinned: true,
		});
		addRootLeaf(app, protectedLeaf);
		const current = createFakeLeaf(app);
		await current.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, current);
		setMostRecentLeaf(app, current);
		const revealLeaf = vi.spyOn(app.workspace, 'revealLeaf');

		closeDuplicateTabs(app);

		expect(collectRootLeaves(app)).toEqual([protectedLeaf]);
		expect(revealLeaf).toHaveBeenCalledWith(protectedLeaf);
	});
});

describe('pushClosedTab', () => {
	function entry(title: string): ClosedTabEntry {
		return {
			viewState: { type: 'markdown', state: { file: `${title}.md` } },
			title,
		};
	}

	it('drops the oldest entries once the ring holds more than CLOSED_TABS_LIMIT', () => {
		const ring: ClosedTabEntry[] = [];
		for (let i = 1; i <= CLOSED_TABS_LIMIT + 1; i++) {
			pushClosedTab(ring, entry(`${i}`));
		}

		expect(ring.map((item) => item.title)).toEqual(['2', '3', '4', '5', '6']);
	});
});

describe('getClosedTabs and removeClosedTab', () => {
	it('returns entries newest first, removes one by reference, and a repeated removal is a no-op', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const first = createFakeLeaf(app);
		await first.setViewState({ type: 'markdown', state: { file: 'First.md' } });
		setDisplayText(first, 'First');
		addRootLeaf(app, first);
		const second = createFakeLeaf(app);
		await second.setViewState({ type: 'markdown', state: { file: 'Second.md' } });
		setDisplayText(second, 'Second');
		addRootLeaf(app, second);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, (leaf) => leaf === first, true);
		app.workspace.trigger('layout-change');
		closeLeaves(app, (leaf) => leaf === second, true);
		app.workspace.trigger('layout-change');

		const closed = getClosedTabs();
		expect(closed.map((item) => item.title)).toEqual(['Second', 'First']);

		removeClosedTab(closed[0]);
		expect(getClosedTabs().map((item) => item.title)).toEqual(['First']);

		removeClosedTab(closed[0]);
		expect(getClosedTabs().map((item) => item.title)).toEqual(['First']);
	});
});

describe('tab tracking', () => {
	it('pushes a closed note leaf with its view state and title', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'Note.md' } });
		setDisplayText(leaf, 'Note');
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs()).toEqual([
			{
				viewState: { type: 'markdown', state: { file: 'Note.md' } },
				title: 'Note',
			},
		]);
	});

	it('pushes the new note when a leaf navigated in place before it closed', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		setDisplayText(leaf, 'A');
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		await leaf.setViewState({ type: 'markdown', state: { file: 'B.md' } });
		setDisplayText(leaf, 'B');
		app.workspace.trigger('active-leaf-change');

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs().map((item) => item.title)).toEqual(['B']);
	});

	it('pushes every leaf from a bulk close in one event, keeping only the last five past the cap', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		for (let i = 1; i <= 6; i++) {
			const leaf = createFakeLeaf(app);
			await leaf.setViewState({ type: 'markdown', state: { file: `${i}.md` } });
			setDisplayText(leaf, `${i}`);
			addRootLeaf(app, leaf);
		}
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs().map((item) => item.title)).toEqual([
			'6', '5', '4', '3', '2',
		]);
	});

	it('never pushes an empty leaf or a Tab Candy leaf', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const empty = createFakeLeaf(app);
		addRootLeaf(app, empty);
		const tabCandy = createFakeLeaf(app);
		await tabCandy.setViewState({ type: TAB_CANDY_VIEW_TYPE });
		addRootLeaf(app, tabCandy);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs()).toEqual([]);
	});

	it('drops a live leaf\'s snapshot once it becomes empty, so a later close pushes nothing', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		await leaf.setViewState({ type: 'empty', state: {} });
		app.workspace.trigger('active-leaf-change');

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs()).toEqual([]);
	});

	it('strips group and active from the pushed view state', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		const peer = createFakeLeaf(app);
		await leaf.setViewState({
			type: 'markdown',
			state: { file: 'A.md' },
			active: true,
			group: peer,
		});
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		const [entry] = getClosedTabs();
		expect(entry.viewState).toEqual({
			type: 'markdown',
			state: { file: 'A.md' },
		});
	});

	it('seeding at layout-ready pushes nothing, and a close after ready is captured', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});

		setLayoutReady(app);
		expect(getClosedTabs()).toEqual([]);

		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		expect(getClosedTabs()).toHaveLength(1);
	});

	it('an unreadable leaf does not stop others from refreshing in the same pass, and keeps its own prior snapshot', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const flaky = createFakeLeaf(app);
		await flaky.setViewState({ type: 'markdown', state: { file: 'Flaky.md' } });
		setDisplayText(flaky, 'Flaky');
		addRootLeaf(app, flaky);
		const stable = createFakeLeaf(app);
		await stable.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		setDisplayText(stable, 'A');
		addRootLeaf(app, stable);
		registerTabTracking(app, () => {});
		setLayoutReady(app);

		makeUnreadable(flaky);
		// The same refresh pass that fails to read flaky must still pick up
		// stable's in-place navigation.
		await stable.setViewState({ type: 'markdown', state: { file: 'B.md' } });
		setDisplayText(stable, 'B');
		app.workspace.trigger('active-leaf-change');

		flaky.detach(); // leaves the tree without going through closeLeaves()
		stable.detach();
		app.workspace.trigger('layout-change');

		const closed = getClosedTabs();
		expect(closed.find((item) => item.title === 'B')).toBeDefined();
		expect(closed.find((item) => item.title === 'Flaky')).toBeDefined();
	});
});

describe('reopenClosedTab', () => {
	it('removes the entry from the ring before reopening it, and opens into a new tab when no target is given', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const closedLeaf = createFakeLeaf(app);
		await closedLeaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		setDisplayText(closedLeaf, 'A');
		addRootLeaf(app, closedLeaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);
		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');
		const [entry] = getClosedTabs();
		const revealLeaf = vi.spyOn(app.workspace, 'revealLeaf');

		await reopenClosedTab(app, entry);

		expect(getClosedTabs()).toEqual([]);
		const reopened = collectRootLeaves(app);
		expect(reopened).toHaveLength(1);
		expect(reopened[0].getViewState()).toEqual({
			type: 'markdown',
			state: { file: 'A.md' },
			active: true,
		});
		expect(revealLeaf).toHaveBeenCalledWith(reopened[0]);
	});

	it('opens into the target leaf when one is given, instead of creating a new tab', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const target = createFakeLeaf(app);
		addRootLeaf(app, target);
		const entry: ClosedTabEntry = {
			viewState: { type: 'markdown', state: { file: 'A.md' } },
			title: 'A',
		};

		await reopenClosedTab(app, entry, target);

		expect(collectRootLeaves(app)).toEqual([target]);
		expect(target.getViewState()).toEqual({
			type: 'markdown',
			state: { file: 'A.md' },
			active: true,
		});
	});
});

describe('reopenLastClosedTab', () => {
	it('does nothing when the ring is empty', () => {
		const app = createFakeWorkspaceApp({ files: {} });

		reopenLastClosedTab(app);

		expect(collectRootLeaves(app)).toEqual([]);
	});

	it('reopens the newest entry into a new tab', async () => {
		const app = createFakeWorkspaceApp({ files: {} });
		const leaf = createFakeLeaf(app);
		await leaf.setViewState({ type: 'markdown', state: { file: 'A.md' } });
		addRootLeaf(app, leaf);
		registerTabTracking(app, () => {});
		setLayoutReady(app);
		closeLeaves(app, () => true, true);
		app.workspace.trigger('layout-change');

		reopenLastClosedTab(app);

		expect(getClosedTabs()).toEqual([]);
		expect(collectRootLeaves(app)).toHaveLength(1);
	});
});