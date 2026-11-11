/** @file Tests for Cluster creation: leaf path reading, the commands, and the tab-header menu. */
import {
	App,
	Command,
	WorkspaceLeaf
} from 'obsidian';
import {
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	createClusterFromDraft,
	describeNewCluster,
	getPanePaths,
	getTabPath,
	registerClusterCreationCommands,
	registerClusterCreationMenu
} from './clusterCreation';
import { Menu as MenuMock } from 'obsidian-test-mocks/obsidian';
import SettingsStore from '../settings/SettingsStore';
import {
	addRootLeaf,
	createFakeWorkspaceApp,
	setMostRecentLeaf
} from '../test/FakeWorkspace';
import {
	createFakeLeaf,
	makeUnreadable
} from '../test/FakeWorkspaceLeaf';
import {
	buildCluster,
	buildClusters,
	buildSettings
} from '../test/fakes';
import {
	ClusterDraft,
	PromptForCluster,
	UNTITLED_CLUSTER_NAME
} from '../types';

/** A fake pane: any object works, leaves are grouped by identity. */
type Pane = object;

/**
 * Adds a file-backed root leaf to the workspace, creating the file in
 * the vault if it isn't there.
 *
 * @param app - The fake app.
 * @param file - File path the leaf shows.
 * @param pane - The pane the leaf belongs to.
 * @returns The leaf.
 */
async function addFileTab(
	app: App,
	file: string,
	pane: Pane
): Promise<WorkspaceLeaf> {
	if (app.vault.getAbstractFileByPath(file) === null) {
		const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '';
		if (folder !== '' && app.vault.getAbstractFileByPath(folder) === null) {
			await app.vault.createFolder(folder);
		}
		await app.vault.create(file, '');
	}
	const leaf = createFakeLeaf(app);
	await leaf.setViewState({ type: 'markdown', state: { file } });
	Object.defineProperty(leaf, 'parent', { value: pane, configurable: true });
	addRootLeaf(app, leaf);
	return leaf;
}

/**
 * Adds a root leaf with no file, such as a Tab Candy view.
 *
 * @param app - The fake app.
 * @param pane - The pane the leaf belongs to.
 * @returns The leaf.
 */
async function addNonFileTab(app: App, pane: Pane): Promise<WorkspaceLeaf> {
	const leaf = createFakeLeaf(app);
	await leaf.setViewState({ type: 'tabcandy-react-view', state: {} });
	Object.defineProperty(leaf, 'parent', { value: pane, configurable: true });
	addRootLeaf(app, leaf);
	return leaf;
}

/**
 * A prompt that submits `draft` immediately.
 *
 * @param draft - The details to submit.
 * @returns The prompt and a spy on it.
 */
function submitting(draft: ClusterDraft): {
	prompt: PromptForCluster;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn((onSubmit: (draft: ClusterDraft) => void) => onSubmit(draft));
	return { prompt: spy, spy };
}

/**
 * A prompt that is cancelled: it never submits.
 *
 * @returns The prompt and a spy on it.
 */
function cancelling(): {
	prompt: PromptForCluster;
	spy: ReturnType<typeof vi.fn>;
} {
	const spy = vi.fn();
	return { prompt: spy as PromptForCluster, spy };
}

/**
 * Builds a store holding no Clusters.
 *
 * @returns The store.
 */
function buildStore(): SettingsStore {
	return new SettingsStore(buildSettings(), async () => {});
}

/**
 * Registers the creation commands and collects them by id.
 *
 * @param app - The fake app.
 * @param store - The store.
 * @param prompt - The prompt.
 * @returns The registered commands by id.
 */
function registerCommands(
	app: App,
	store: SettingsStore,
	prompt: PromptForCluster
): Record<string, Command> {
	const commands: Record<string, Command> = {};
	registerClusterCreationCommands(
		app,
		store,
		(command) => {
			commands[command.id] = command;
			return command;
		},
		prompt
	);
	return commands;
}

/**
 * Runs a command's availability check.
 *
 * @param command - The command.
 * @returns Whether the command is available.
 */
function isAvailable(command: Command): boolean {
	return command.checkCallback?.(true) === true;
}

/** A menu item as the mock `Menu` records it. */
interface RecordedItem {
	title: string;
	click: () => void;
}

/**
 * Reads the items a mock `Menu` recorded.
 *
 * @param menu - The mock menu.
 * @returns The items, in the order they were added.
 */
function recordedItems(menu: MenuMock): RecordedItem[] {
	return menu.menuItems__.map((item) => ({
		title: String(item.title__),
		click: () => {
			item.onClick__?.(new MouseEvent('click'));
		},
	}));
}

describe('getTabPath', () => {
	it('returns the file path of a file-backed leaf', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'Notes/a.md', {});

		const result = getTabPath(leaf);

		expect(result).toBe('Notes/a.md');
	});

	it('returns null for a leaf with no file', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(app, {});

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
		const leaf = await addFileTab(app, 'a.md', {});
		makeUnreadable(leaf);

		const result = getTabPath(leaf);

		expect(result).toBeNull();
	});
});

describe('getPanePaths', () => {
	it('returns the file paths of every tab in the leaf\'s pane, in tab order', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'one.md', pane);
		const second = await addFileTab(app, 'two.md', pane);
		await addFileTab(app, 'three.md', pane);

		const result = getPanePaths(app, second);

		expect(result).toEqual(['one.md', 'two.md', 'three.md']);
	});

	it('excludes tabs in other panes', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const mine = await addFileTab(app, 'mine.md', pane);
		await addFileTab(app, 'other.md', {});

		const result = getPanePaths(app, mine);

		expect(result).toEqual(['mine.md']);
	});

	it('excludes tabs in the pane that have no file', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const file = await addFileTab(app, 'a.md', pane);
		await addNonFileTab(app, pane);

		const result = getPanePaths(app, file);

		expect(result).toEqual(['a.md']);
	});

	it('excludes tabs in the pane whose state cannot be read', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		const readable = await addFileTab(app, 'a.md', pane);
		const unreadable = await addFileTab(app, 'b.md', pane);
		makeUnreadable(unreadable);

		const result = getPanePaths(app, readable);

		expect(result).toEqual(['a.md']);
	});

	it('returns an empty array for a leaf that is not a root leaf', async () => {
		const app = createFakeWorkspaceApp();
		await addFileTab(app, 'a.md', {});
		const stray = createFakeLeaf(app);
		Object.defineProperty(stray, 'parent', { value: {}, configurable: true });

		const result = getPanePaths(app, stray);

		expect(result).toEqual([]);
	});
});

describe('createClusterFromDraft', () => {
	it('saves a Cluster with the draft\'s name, Flavor and the given members', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{ name: 'Research', flavor: '#ff8800' },
			['a.md', 'b.md'],
			500
		);

		expect(store.get().clusters[cluster.id]).toEqual({
			id: cluster.id,
			name: 'Research',
			flavor: '#ff8800',
			members: ['a.md', 'b.md'],
			lastTouchedAt: 500,
			pairedWith: null,
		});
	});

	it('leaves the other Clusters untouched', async () => {
		const existing = buildCluster({ id: 'existing' });
		const store = new SettingsStore(
			buildSettings({ clusters: buildClusters(existing) }),
			async () => {}
		);

		await createClusterFromDraft(
			store,
			{ name: 'New' },
			[]
		);

		expect(store.get().clusters.existing).toBe(existing);
	});

	it('persists the new settings', async () => {
		const persist = vi.fn(async () => {});
		const store = new SettingsStore(buildSettings(), persist);

		await createClusterFromDraft(
			store,
			{ name: 'New' },
			[]
		);

		expect(persist).toHaveBeenCalledTimes(1);
	});

	it('names a Cluster with a blank name Untitled', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{ name: '' },
			[]
		);

		expect(cluster.name).toBe(UNTITLED_CLUSTER_NAME);
	});

	it('leaves Flavor unset when the draft has none', async () => {
		const store = buildStore();

		const cluster = await createClusterFromDraft(
			store,
			{ name: 'Plain' },
			[]
		);

		expect(cluster).not.toHaveProperty('flavor');
	});
});

describe('describeNewCluster', () => {
	it.each([
		['no members', [], 'Created empty Cluster "Research".'],
		['one member', ['a.md'], 'Created Cluster "Research" with 1 tab.'],
		['several members', ['a.md', 'b.md'], 'Created Cluster "Research" with 2 tabs.'],
	])('describes a Cluster with %s', (_kind, members, expected) => {
		const cluster = buildCluster({ name: 'Research', members });

		const result = describeNewCluster(cluster);

		expect(result).toBe(expected);
	});
});

describe('registerClusterCreationCommands', () => {
	it('registers the three commands with their ids and names', () => {
		const app = createFakeWorkspaceApp();

		const commands = registerCommands(
			app,
			buildStore(),
			cancelling().prompt
		);

		expect(
			Object.values(commands).map((command) => [command.id, command.name])
		).toEqual([
			['create-cluster', 'Create cluster'],
			['create-cluster-from-active-tab', 'Create cluster from active tab'],
			['create-cluster-from-active-pane', 'Create cluster from active pane'],
		]);
	});

	describe('Create cluster', () => {
		it('creates an empty Cluster from the submitted details', () => {
			const app = createFakeWorkspaceApp();
			const store = buildStore();
			const { prompt } = submitting({ name: 'Blank', flavor: '#00ff00' });
			const commands = registerCommands(
				app,
				store,
				prompt
			);

			commands['create-cluster'].callback?.();

			const [created] = Object.values(store.get().clusters);
			expect(created.name).toBe('Blank');
			expect(created.flavor).toBe('#00ff00');
			expect(created.members).toEqual([]);
		});

		it('creates nothing when the prompt is cancelled', () => {
			const app = createFakeWorkspaceApp();
			const store = buildStore();
			const commands = registerCommands(
				app,
				store,
				cancelling().prompt
			);

			commands['create-cluster'].callback?.();

			expect(store.get().clusters).toEqual({});
		});
	});

	describe('Create cluster from active tab', () => {
		it('is available when the most recent tab is file-backed', async () => {
			const app = createFakeWorkspaceApp();
			const leaf = await addFileTab(app, 'a.md', {});
			setMostRecentLeaf(app, leaf);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-tab']);

			expect(result).toBe(true);
		});

		it('is unavailable when the most recent tab has no file', async () => {
			const app = createFakeWorkspaceApp();
			const leaf = await addNonFileTab(app, {});
			setMostRecentLeaf(app, leaf);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-tab']);

			expect(result).toBe(false);
		});

		it('is unavailable when there is no most recent tab', () => {
			const app = createFakeWorkspaceApp();
			setMostRecentLeaf(app, null);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-tab']);

			expect(result).toBe(false);
		});

		it('does not prompt when only checking availability', async () => {
			const app = createFakeWorkspaceApp();
			const leaf = await addFileTab(app, 'a.md', {});
			setMostRecentLeaf(app, leaf);
			const { prompt, spy } = cancelling();
			const commands = registerCommands(
				app,
				buildStore(),
				prompt
			);

			isAvailable(commands['create-cluster-from-active-tab']);

			expect(spy).not.toHaveBeenCalled();
		});

		it('creates a Cluster holding only the active tab\'s file', async () => {
			const app = createFakeWorkspaceApp();
			const pane = {};
			await addFileTab(app, 'sibling.md', pane);
			const active = await addFileTab(app, 'active.md', pane);
			setMostRecentLeaf(app, active);
			const store = buildStore();
			const commands = registerCommands(
				app,
				store,
				submitting({ name: 'One' }).prompt
			);

			commands['create-cluster-from-active-tab'].checkCallback?.(false);

			const [created] = Object.values(store.get().clusters);
			expect(created.members).toEqual(['active.md']);
		});
	});

	describe('Create cluster from active pane', () => {
		it('is available when the most recent tab\'s pane has file-backed tabs', async () => {
			const app = createFakeWorkspaceApp();
			const leaf = await addFileTab(app, 'a.md', {});
			setMostRecentLeaf(app, leaf);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-pane']);

			expect(result).toBe(true);
		});

		it('is available when the most recent tab has no file but its pane does', async () => {
			const app = createFakeWorkspaceApp();
			const pane = {};
			await addFileTab(app, 'a.md', pane);
			const leaf = await addNonFileTab(app, pane);
			setMostRecentLeaf(app, leaf);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-pane']);

			expect(result).toBe(true);
		});

		it('is unavailable when no tab in the pane has a file', async () => {
			const app = createFakeWorkspaceApp();
			const leaf = await addNonFileTab(app, {});
			setMostRecentLeaf(app, leaf);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-pane']);

			expect(result).toBe(false);
		});

		it('is unavailable when there is no most recent tab', () => {
			const app = createFakeWorkspaceApp();
			setMostRecentLeaf(app, null);
			const commands = registerCommands(
				app,
				buildStore(),
				cancelling().prompt
			);

			const result = isAvailable(commands['create-cluster-from-active-pane']);

			expect(result).toBe(false);
		});

		it('creates a Cluster holding every file in the pane, not other panes', async () => {
			const app = createFakeWorkspaceApp();
			const pane = {};
			await addFileTab(app, 'one.md', pane);
			const active = await addFileTab(app, 'two.md', pane);
			await addFileTab(app, 'elsewhere.md', {});
			setMostRecentLeaf(app, active);
			const store = buildStore();
			const commands = registerCommands(
				app,
				store,
				submitting({ name: 'Pane' }).prompt
			);

			commands['create-cluster-from-active-pane'].checkCallback?.(false);

			const [created] = Object.values(store.get().clusters);
			expect(created.members).toEqual(['one.md', 'two.md']);
		});

		it('collapses a file open in two tabs of the pane to one member', async () => {
			const app = createFakeWorkspaceApp();
			const pane = {};
			await addFileTab(app, 'same.md', pane);
			const active = await addFileTab(app, 'same.md', pane);
			setMostRecentLeaf(app, active);
			const store = buildStore();
			const commands = registerCommands(
				app,
				store,
				submitting({ name: 'Pane' }).prompt
			);

			commands['create-cluster-from-active-pane'].checkCallback?.(false);

			const [created] = Object.values(store.get().clusters);
			expect(created.members).toEqual(['same.md']);
		});
	});
});

describe('registerClusterCreationMenu', () => {
	/**
	 * Registers the menu listener and opens a menu the way Obsidian does.
	 *
	 * @param app - The fake app.
	 * @param store - The store.
	 * @param prompt - The prompt.
	 * @param source - The `source` Obsidian passes.
	 * @param leaf - The `leaf` Obsidian passes.
	 * @returns The items added to the menu.
	 */
	function openMenu(
		app: App,
		store: SettingsStore,
		prompt: PromptForCluster,
		source: string,
		leaf: WorkspaceLeaf | undefined
	): RecordedItem[] {
		registerClusterCreationMenu(
			app,
			store,
			() => {},
			prompt
		);
		const menu = MenuMock.create2__();
		app.workspace.trigger(
			'file-menu',
			menu.asOriginalType2__(),
			{ path: 'irrelevant.md' },
			source,
			leaf
		);
		return recordedItems(menu);
	}

	it('registers one listener', () => {
		const app = createFakeWorkspaceApp();
		const registerEvent = vi.fn();

		registerClusterCreationMenu(
			app,
			buildStore(),
			registerEvent,
			cancelling().prompt
		);

		expect(registerEvent).toHaveBeenCalledTimes(1);
	});

	it('adds both items to a tab header\'s menu', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			leaf
		);

		expect(items.map((item) => item.title)).toEqual([
			'Create cluster from tab',
			'Create cluster from pane',
		]);
	});

	it('adds nothing to a menu from another source', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addFileTab(app, 'a.md', {});

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'file-explorer-context-menu',
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds nothing when no leaf is given', () => {
		const app = createFakeWorkspaceApp();

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			undefined
		);

		expect(items).toEqual([]);
	});

	it('adds nothing for a tab with no file in a pane with none', async () => {
		const app = createFakeWorkspaceApp();
		const leaf = await addNonFileTab(app, {});

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			leaf
		);

		expect(items).toEqual([]);
	});

	it('adds only the pane item for a tab with no file in a pane with files', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'a.md', pane);
		const leaf = await addNonFileTab(app, pane);

		const items = openMenu(
			app,
			buildStore(),
			cancelling().prompt,
			'tab-header',
			leaf
		);

		expect(items.map((item) => item.title)).toEqual(['Create cluster from pane']);
	});

	it('creates a Cluster of the clicked tab only from "Create cluster from tab"', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'sibling.md', pane);
		const clicked = await addFileTab(app, 'clicked.md', pane);
		const store = buildStore();
		const items = openMenu(
			app,
			store,
			submitting({ name: 'Tab' }).prompt,
			'tab-header',
			clicked
		);

		items[0].click();

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['clicked.md']);
	});

	it('creates a Cluster of the whole pane from "Create cluster from pane"', async () => {
		const app = createFakeWorkspaceApp();
		const pane = {};
		await addFileTab(app, 'sibling.md', pane);
		const clicked = await addFileTab(app, 'clicked.md', pane);
		const store = buildStore();
		const items = openMenu(
			app,
			store,
			submitting({ name: 'Pane' }).prompt,
			'tab-header',
			clicked
		);

		items[1].click();

		const [created] = Object.values(store.get().clusters);
		expect(created.members).toEqual(['sibling.md', 'clicked.md']);
	});

	it('creates nothing when the prompt is cancelled', async () => {
		const app = createFakeWorkspaceApp();
		const clicked = await addFileTab(app, 'clicked.md', {});
		const store = buildStore();
		const items = openMenu(
			app,
			store,
			cancelling().prompt,
			'tab-header',
			clicked
		);

		items[0].click();

		expect(store.get().clusters).toEqual({});
	});
});