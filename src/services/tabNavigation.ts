import {
	App,
	EventRef,
	ViewState,
	WorkspaceLeaf,
} from 'obsidian';
import {
	CLOSED_TABS_LIMIT,
	TAB_CANDY_VIEW_TYPE,
	ClosedTabEntry,
	TabRecord
} from '../types';

// One snapshot per live, worth-remembering leaf, refreshed continuously so
// there's always something to record if the leaf closes.
const snapshots = new Map<WorkspaceLeaf, ClosedTabEntry>();

// Closed tabs, oldest first.
const closedTabsRing: ClosedTabEntry[] = [];

/**
 * Closes every duplicate tab, keeping one survivor per duplicate set, and
 * reveals the survivor if the current tab was among those closed.
 */
export function closeDuplicateTabs(app: App): void {
	const plan = planDuplicateClosures(
		getRootLeaves(app).map(toTabRecord),
		app.workspace.getMostRecentLeaf()
	);
	const doomed = new Set(plan.close);
	closeLeaves(
		app,
		(leaf) => doomed.has(leaf),
		false
	);
	if (plan.reveal) {
		void app.workspace.revealLeaf(plan.reveal);
	}
}

/**
 * Closes every root leaf `shouldClose` selects, except a pinned leaf or one
 * whose state can't be read - those are never offered to `shouldClose` at
 * all. Leaves are collected up front, before anything is detached, so
 * closing one leaf can't change which others get considered.
 *
 * When `remember` is false, each closed leaf is passed to forgetLeaf()
 * before being detached.
 */
export function closeLeaves(
	app: App,
	shouldClose: (leaf: WorkspaceLeaf, viewState: ViewState) => boolean,
	remember: boolean
): void {
	const doomed: WorkspaceLeaf[] = [];
	for (const leaf of getRootLeaves(app)) {
		const viewState = readViewState(leaf);
		if (viewState === null || viewState.pinned === true) {
			continue;
		}
		if (shouldClose(leaf, viewState)) {
			doomed.push(leaf);
		}
	}
	for (const leaf of doomed) {
		if (!remember) {
			forgetLeaf(leaf);
		}
		leaf.detach();
	}
}

/**
 * Closes every tab except the current one. The current tab is resolved via
 * getMostRecentLeaf(); if that returns null, or returns a leaf that isn't
 * a root leaf, nothing is closed.
 */
export function closeOtherTabs(app: App): void {
	const current = app.workspace.getMostRecentLeaf();
	if (current === null || !getRootLeaves(app).includes(current)) {
		return;
	}
	closeLeaves(
		app,
		(leaf) => leaf !== current,
		true
	);
}

/**
 * Closes every tab whose file lives under the given folder.
 */
export function closeTabsInFolder(
	app: App,
	folderPath: string,
	recursive: boolean
): void {
	closeLeaves(
		app,
		(_leaf, viewState) => {
			const path = getViewStateFilePath(viewState);
			return path !== null && isUnderFolder(path, folderPath, recursive);
		},
		true
	);
}

/**
 * If a root leaf other than `host` already has `path` open, switches focus
 * to it and returns true. Otherwise returns false and leaves the workspace
 * untouched. Matches by file path only, regardless of view type, and takes
 * the first match in iterateRootLeaves() order - deliberately looser than
 * toTabRecord()'s type-plus-path duplicate key, since this only moves
 * focus rather than destroying a tab.
 */
export function focusOpenLeaf(
	app: App,
	path: string,
	host: WorkspaceLeaf
): boolean {
	const existing = getRootLeaves(app).find(
		(leaf) => leaf !== host && getLeafFilePath(leaf) === path
	);
	if (!existing) {
		return false;
	}
	app.workspace.setActiveLeaf(existing, { focus: true });
	return true;
}

/**
 * Removes a leaf's snapshot, so closing it afterward is not recorded.
 */
function forgetLeaf(leaf: WorkspaceLeaf): void {
	snapshots.delete(leaf);
}

/**
 * Returns the element adjacent to `current` in `leaves`, wrapping around at
 * either end. Returns null when `current` isn't in the list (nothing to
 * cycle from) or the list has fewer than two elements (nothing to cycle
 * to).
 */
export function getAdjacentLeaf<T>(
	leaves: T[],
	current: T,
	direction: 1 | -1
): T | null {
	const index = leaves.indexOf(current);
	if (index === -1 || leaves.length < 2) {
		return null;
	}
	return leaves[(index + direction + leaves.length) % leaves.length];
}

/**
 * The closed-tabs ring, newest first.
 */
export function getClosedTabs(): readonly ClosedTabEntry[] {
	return [...closedTabsRing].reverse();
}

/**
 * A leaf's file path, or null if it has none or its state can't be read.
 * A one-line wrapper around getViewStateFilePath() for callers that only
 * have a leaf, not an already-read view state.
 */
function getLeafFilePath(leaf: WorkspaceLeaf): string | null {
	const viewState = readViewState(leaf);
	return viewState === null ? null : getViewStateFilePath(viewState);
}

/**
 * Collects every root leaf (a tab, as opposed to a sidebar panel) currently
 * open in the workspace.
 */
function getRootLeaves(app: App): WorkspaceLeaf[] {
	const leaves: WorkspaceLeaf[] = [];
	app.workspace.iterateRootLeaves((leaf) => {
		leaves.push(leaf);
	});
	return leaves;
}

/**
 * Returns the file path a view state points at, or null if it doesn't
 * point at a file. Reads the `state.file` convention shared by markdown,
 * canvas, PDF, and most other file-backed views, without importing any of
 * their specific types.
 */
export function getViewStateFilePath(viewState: ViewState): string | null {
	const { file } = viewState.state ?? {};
	return typeof file === 'string' ? file : null;
}

/**
 * Moves focus to the next (`1`) or previous (`-1`) tab, walking every root
 * leaf in iterateRootLeaves() order and wrapping at both ends. The current
 * tab is resolved via getMostRecentLeaf(); if that returns null, or a leaf
 * outside the root leaves, nothing happens - getAdjacentLeaf() already
 * returns null for a `current` that isn't in the list, so there's no need
 * to check root-leaf membership separately here the way closeOtherTabs()
 * does.
 */
export function goToAdjacentTab(app: App, direction: 1 | -1): void {
	const current = app.workspace.getMostRecentLeaf();
	if (current === null) {
		return;
	}

	const next = getAdjacentLeaf(
		getRootLeaves(app),
		current,
		direction
	);
	if (next) {
		app.workspace.setActiveLeaf(next, { focus: true });
	}
}

/**
 * Whether a view state belongs to a linked group - present and non-null,
 * regardless of its runtime shape.
 */
function isLinked(viewState: ViewState): boolean {
	return viewState.group !== undefined && viewState.group !== null;
}

/**
 * Whether a file path falls under a folder. In recursive mode this
 * includes every descendant folder; otherwise it only matches files
 * directly inside the folder. `folderPath === ''` means the vault root.
 */
export function isUnderFolder(
	filePath: string,
	folderPath: string,
	recursive: boolean
): boolean {
	if (filePath === folderPath) {
		return true;
	}
	if (recursive) {
		return folderPath === '' || filePath.startsWith(`${folderPath}/`);
	}
	const lastSlash = filePath.lastIndexOf('/');
	const parentPath = lastSlash === -1 ? '' : filePath.slice(0, lastSlash);
	return parentPath === folderPath;
}

/**
 * Whether a view state is worth keeping a snapshot of. Tab Candy's own view
 * and an empty pane are excluded, since reopening either isn't meaningful.
 */
function isWorthRemembering(viewState: ViewState): boolean {
	return viewState.type !== TAB_CANDY_VIEW_TYPE && viewState.type !== 'empty';
}

/**
 * Diffs the current root leaves against the snapshot cache: any leaf with
 * a snapshot that's no longer in the tree has closed, so its snapshot is
 * pushed to the ring. Runs before refreshing so a leaf that just closed is
 * compared against its state from before the close, not after.
 */
function onLayoutChange(app: App): void {
	const current = new Set<WorkspaceLeaf>();
	app.workspace.iterateRootLeaves((leaf) => current.add(leaf));

	for (const [leaf, entry] of snapshots) {
		if (!current.has(leaf)) {
			pushClosedTab(closedTabsRing, entry);
			snapshots.delete(leaf);
		}
	}
	current.forEach(refreshSnapshot);
}

/**
 * Groups records by key and decides which leaf in each duplicate set
 * survives:
 *   1. A protected leaf, if the set has one. Every unprotected leaf in the
 *      set is closed.
 *   2. Otherwise the current leaf, if it is in the set.
 *   3. Otherwise the first leaf in the set.
 * `reveal` is only set when the current leaf itself was closed, pointing
 * at the surviving copy from its set.
 */
export function planDuplicateClosures(
	records: TabRecord[],
	current: WorkspaceLeaf | null
): { close: WorkspaceLeaf[]; reveal: WorkspaceLeaf | null } {
	const sets = new Map<string, TabRecord[]>();
	for (const record of records) {
		if (record.key === null) {
			continue;
		}
		const set = sets.get(record.key);
		if (set) {
			set.push(record);
		} else {
			sets.set(record.key, [record]);
		}
	}

	const close: WorkspaceLeaf[] = [];
	let reveal: WorkspaceLeaf | null = null;
	for (const set of sets.values()) {
		if (set.length < 2) {
			continue;
		}
		const keeper =
			set.find((record) => record.isProtected) ??
			set.find((record) => record.leaf === current) ??
			set[0];
		for (const record of set) {
			if (record === keeper || record.isProtected) {
				continue;
			}
			close.push(record.leaf);
			if (record.leaf === current) {
				reveal = keeper.leaf;
			}
		}
	}
	return { close, reveal };
}

/**
 * Appends an entry to a closed-tabs ring, dropping the oldest entries past
 * CLOSED_TABS_LIMIT.
 */
export function pushClosedTab(ring: ClosedTabEntry[], entry: ClosedTabEntry): void {
	ring.push(entry);
	while (ring.length > CLOSED_TABS_LIMIT) {
		ring.shift();
	}
}

/**
 * Reads a leaf's view state, returning null instead of throwing if it
 * can't be read. Callers treat null the same as "leave this leaf alone" -
 * a leaf whose state can't be read is never closed and never treated as
 * safe to act on.
 */
function readViewState(leaf: WorkspaceLeaf): ViewState | null {
	try {
		return leaf.getViewState();
	} catch {
		return null;
	}
}

/**
 * Starts tracking closed tabs: seeds a snapshot for every leaf once the
 * workspace is ready, then keeps snapshots current as leaves open, close,
 * or navigate in place.
 */
export function registerTabTracking(
	app: App,
	registerEvent: (eventRef: EventRef) => void
): void {
	app.workspace.onLayoutReady(() => {
		refreshAllSnapshots(app);
		registerEvent(app.workspace.on('layout-change', () => onLayoutChange(app)));
		registerEvent(app.workspace.on('active-leaf-change', () => refreshAllSnapshots(app)));
		registerEvent(app.workspace.on('file-open', () => refreshAllSnapshots(app)));
	});
}

function refreshAllSnapshots(app: App): void {
	app.workspace.iterateRootLeaves(refreshSnapshot);
}

/**
 * Refreshes a live leaf's snapshot from its current state. Drops the
 * snapshot if the leaf has become not worth remembering, and leaves an
 * existing snapshot untouched (rather than dropping it) if the leaf's
 * state can't be read right now.
 */
function refreshSnapshot(leaf: WorkspaceLeaf): void {
	const viewState = readViewState(leaf);
	if (viewState === null) {
		return;
	}
	if (!isWorthRemembering(viewState)) {
		snapshots.delete(leaf);
		return;
	}
	const sanitized = { ...viewState };
	delete sanitized.group;
	delete sanitized.active;
	snapshots.set(leaf, { viewState: sanitized, title: leaf.getDisplayText() });
}

/**
 * Removes an entry from the closed-tabs ring by reference. Removing an
 * entry that isn't in the ring does nothing.
 */
export function removeClosedTab(entry: ClosedTabEntry): void {
	const index = closedTabsRing.indexOf(entry);
	if (index !== -1) {
		closedTabsRing.splice(index, 1);
	}
}

/**
 * Reopens a closed tab's entry, removing it from the ring first so it
 * can't be reopened twice. Reopens into `target` if given, otherwise into
 * a new tab.
 */
export async function reopenClosedTab(
	app: App,
	entry: ClosedTabEntry,
	target?: WorkspaceLeaf
): Promise<void> {
	removeClosedTab(entry);
	const leaf = target ?? app.workspace.getLeaf('tab');
	await leaf.setViewState({ ...entry.viewState, active: true });
	await app.workspace.revealLeaf(leaf);
}

/**
 * Reopens the most recently closed tab into a new tab. Does nothing when
 * the ring is empty.
 */
export function reopenLastClosedTab(app: App): void {
	const [newest] = getClosedTabs();
	if (newest) {
		void reopenClosedTab(app, newest);
	}
}

/**
 * Clears both tracking structures.
 */
export function resetTabTrackingState(): void {
	snapshots.clear();
	closedTabsRing.length = 0;
}

export function toTabRecord(leaf: WorkspaceLeaf): TabRecord {
	const viewState = readViewState(leaf);
	if (viewState === null) {
		return { leaf, key: null, isProtected: true };
	}
	const file = getViewStateFilePath(viewState);
	return {
		leaf,
		key: file === null ? null : JSON.stringify([viewState.type, file]),
		isProtected: viewState.pinned === true || isLinked(viewState),
	};
}