/** @file Tests for the actions a Cluster's member list offers. */
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { buildMemberActions } from './clusterMemberActions';
import { buildStoreWith } from '../test/clusterHelpers';
import { setDragManager } from '../test/dragHelpers';
import { buildCluster, createConfiguredApp } from '../test/fakes';

const opened = vi.hoisted((): unknown[][] => []);

vi.mock('../ui/ResolveMissingModal', () => ({
	default: class {
		constructor(...args: unknown[]) {
			opened.push(args);
		}

		open(): void {}
	},
}));

describe('buildMemberActions', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('moves a member within its own Cluster', async () => {
		const store = buildStoreWith(buildCluster({ id: 'one', members: ['a.md', 'b.md', 'c.md'] }));
		const actions = buildMemberActions(
			createConfiguredApp(),
			store,
			'one'
		);

		actions.moveMember(0, 2);
		await vi.runAllTimersAsync();

		expect(store.get().clusters['one'].members).toEqual(['b.md', 'c.md', 'a.md']);
	});

	it('removes a member from its own Cluster only', async () => {
		const store = buildStoreWith(
			buildCluster({ id: 'one', members: ['a.md', 'b.md'] }),
			buildCluster({ id: 'two', members: ['a.md'] })
		);
		const actions = buildMemberActions(
			createConfiguredApp(),
			store,
			'one'
		);

		actions.removeMember('a.md');
		await vi.runAllTimersAsync();

		expect(store.get().clusters['one'].members).toEqual(['b.md']);
		expect(store.get().clusters['two'].members).toEqual(['a.md']);
	});

	it('opens a member in the active pane', async () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const openFile = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(app.workspace, 'getLeaf').mockReturnValue({ openFile } as never);
		const actions = buildMemberActions(
			app,
			buildStoreWith(buildCluster({ id: 'one', members: ['a.md'] })),
			'one'
		);

		actions.openMember('a.md');
		await vi.runAllTimersAsync();

		expect(openFile).toHaveBeenCalledTimes(1);
	});

	it('starts a member drag through the drag manager', () => {
		const app = createConfiguredApp({ files: { 'a.md': '' } });
		const dragFile = vi.fn();
		setDragManager(app, { dragFile });
		const actions = buildMemberActions(
			app,
			buildStoreWith(buildCluster({ id: 'one', members: ['a.md'] })),
			'one'
		);

		actions.dragMember('a.md', new Event('dragstart') as DragEvent);

		expect(dragFile).toHaveBeenCalledTimes(1);
	});

	it('opens the resolve modal for its own Cluster', () => {
		opened.length = 0;
		const app = createConfiguredApp();
		const store = buildStoreWith(buildCluster({ id: 'one' }));
		const actions = buildMemberActions(
			app,
			store,
			'one'
		);

		actions.resolveMissing('gone.md');

		expect(opened).toEqual([[app, store, 'one', 'gone.md']]);
	});
});