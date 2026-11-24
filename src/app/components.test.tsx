/** @file Tests for the app components. */
import {
	TFile,
	addIcon
} from 'obsidian';
import { createRef } from 'react';
import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import {
	cleanup,
	createEvent,
	fireEvent,
	render,
	screen
} from '@testing-library/react';
import {
	BackgroundSurface,
	Bookmarks,
	ClusterRow,
	Icon,
	MemberRow,
	QuoteDisplay,
	RecentFiles,
	RecentlyClosedTabs,
	SearchButton
} from './components';
import { buildDataTransfer } from '../test/dragHelpers';
import {
	buildCluster,
	createConfiguredApp
} from '../test/fakes';
import { captureMenus } from '../test/menuHelpers';
import {
	ClosedTabEntry,
	TabCandyCluster
} from '../types';

/**
 * Builds a vault file.
 *
 * @param path - Vault-relative path.
 * @returns The file.
 */
function buildFile(path: string): TFile {
	const app = createConfiguredApp({ files: { [path]: '' } });
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) {
		throw new Error(`Expected '${path}' to resolve to a TFile in the fake vault`);
	}
	return file;
}

afterEach(cleanup);

/**
 * Renders a row with inert handlers unless overridden.
 *
 * @param cluster - The Cluster.
 * @param overrides - Props to replace.
 * @returns The render result.
 */
function renderRow(
	cluster: TabCandyCluster,
	overrides: Partial<Parameters<typeof ClusterRow>[0]> = {}
): ReturnType<typeof render> {
	return render(<ClusterRow
		cluster = { cluster }
		expanded = { false }
		getDraggedPath = { () => null }
		hasOpenMember = { () => false }
		isFilePresent = { () => true }
		onCloseCluster = { () => {} }
		onConfirmUnlink = { () => {} }
		onDeleteCluster = { () => {} }
		onDragCluster = { () => {} }
		onDragMember = { () => {} }
		onDropPath = { () => {} }
		onEditCluster = { () => {} }
		onMoveMember = { () => {} }
		onOpenCluster = { () => {} }
		onOpenMember = { () => {} }
		onOpenTray = { () => {} }
		onPair = { () => {} }
		onRemoveMember = { () => {} }
		onResolveMissing = { () => {} }
		onToggle = { () => {} }
		onUnlink = { () => {} }
		pairedName = { null }
		{ ...overrides }
	/>);
}

describe('ClusterRow', () => {
	it('shows the Cluster\'s name and member count', () => {
		renderRow(buildCluster({ 
			name: 'Reading', 
			members: [
				'a.md', 
				'b.md'
			] 
		}));

		expect([
			screen.getByText('Reading').textContent, 
			screen.getByText('2').textContent
		]).toEqual([
			'Reading', 
			'2'
		]);
	});

	it('hides the members while collapsed', () => {
		renderRow(buildCluster({ members: ['a.md'] }));

		expect(screen.queryByText('a')).toBeNull();
	});

	it('lists the members in order while expanded', () => {
		const { container } = renderRow(
			buildCluster({ members: [
				'b.md', 
				'a.md'
			] }),
			{ expanded: true }
		);

		const titles = Array.from(container.querySelectorAll('.tabcandy-member-title'))
			.map((title) => title.textContent);

		expect(titles).toEqual([
			'b', 
			'a'
		]);
	});

	it('says there are no tabs when an expanded Cluster is empty', () => {
		renderRow(
			buildCluster(), 
			{ expanded: true }
		);

		expect(screen.getByText('No tabs yet.')).toBeTruthy();
	});

	it('marks only the members whose files are missing', () => {
		const { container } = renderRow(
			buildCluster({ members: [
				'here.md', 
				'gone.md'
			] }),
			{
				expanded: true,
				isFilePresent: (path) => path === 'here.md',
			}
		);

		const unresolved = Array.from(container.querySelectorAll('.is-unresolved .tabcandy-member-title'))
			.map((title) => title.textContent);

		expect(unresolved).toEqual(['gone']);
	});

	it('reports the expanded state to assistive technology', () => {
		renderRow(
			buildCluster(), 
			{ expanded: true }
		);

		expect(screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		).getAttribute('aria-expanded')).toBe('true');
	});

	it('toggles when the header is clicked', () => {
		const onToggle = vi.fn();
		renderRow(
			buildCluster(), 
			{ onToggle }
		);

		fireEvent.click(screen.getByText('Cluster A'));

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('toggles when Enter is pressed on the header', () => {
		const onToggle = vi.fn();
		renderRow(
			buildCluster(), 
			{ onToggle }
		);

		fireEvent.keyDown(
			screen.getByRole(
				'button', 
				{ name: /Cluster A/ }
			), 
			{ key: 'Enter' }
		);

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('toggles when Space is pressed on the header', () => {
		const onToggle = vi.fn();
		renderRow(
			buildCluster(), 
			{ onToggle }
		);

		fireEvent.keyDown(
			screen.getByRole(
				'button', 
				{ name: /Cluster A/ }
			), 
			{ key: ' ' }
		);

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('does not toggle on other keys', () => {
		const onToggle = vi.fn();
		renderRow(
			buildCluster(), 
			{ onToggle }
		);

		fireEvent.keyDown(
			screen.getByRole(
				'button', 
				{ name: /Cluster A/ }
			), 
			{ key: 'a' }
		);

		expect(onToggle).not.toHaveBeenCalled();
	});

	it('exposes the Flavor to CSS', () => {
		renderRow(buildCluster({ flavor: '#ff0000' }));

		const header = screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		);

		expect(header.style.getPropertyValue('--tabcandy-flavor')).toBe('#ff0000');
	});

	it('sets no Flavor variable for a Cluster without one', () => {
		renderRow(buildCluster());

		const header = screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		);

		expect(header.style.getPropertyValue('--tabcandy-flavor')).toBe('');
	});

	it('marks the header as flavored when the Cluster has a Flavor', () => {
		renderRow(buildCluster({ flavor: '#ff0000' }));

		const header = screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		);

		expect(header.classList.contains('tabcandy-cluster-header--flavored')).toBe(true);
	});

	it('does not mark the header as flavored without a Flavor', () => {
		renderRow(buildCluster());

		const header = screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		);

		expect(header.classList.contains('tabcandy-cluster-header--flavored')).toBe(false);
	});

	it('opens the clicked member by path', () => {
		const onOpenMember = vi.fn();
		renderRow(
			buildCluster({ members: ['Notes/a.md'] }),
			{ 
				expanded: true, 
				onOpenMember 
			}
		);

		fireEvent.click(screen.getByText('a'));

		expect(onOpenMember).toHaveBeenCalledWith('Notes/a.md');
	});

	it('removes the clicked member by path', () => {
		const onRemoveMember = vi.fn();
		renderRow(
			buildCluster({ members: ['Notes/a.md'] }),
			{ 
				expanded: true, 
				onRemoveMember 
			}
		);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect(onRemoveMember).toHaveBeenCalledWith('Notes/a.md');
	});

	it('can be dragged, and reports the element under the pointer when the drag ends', () => {
		const target = createDiv();
		const elementFromPoint = vi.fn(() => target);
		Object.defineProperty(
			document, 
			'elementFromPoint', 
			{ 
				value: elementFromPoint, 
				configurable: true 
			}
		);
		const onDragCluster = vi.fn();
		renderRow(
			buildCluster(), 
			{ onDragCluster }
		);
		const header = screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		);

		// Sets the pointer position on the event.
		const dragEnd = createEvent.dragEnd(
			header, 
			{ dataTransfer: buildDataTransfer() }
		);
		Object.defineProperties(dragEnd, {
			clientX: { value: 30 },
			clientY: { value: 40 },
		});
		fireEvent(
			header, 
			dragEnd
		);
		Reflect.deleteProperty(
			document, 
			'elementFromPoint'
		);

		expect(header.getAttribute('draggable')).toBe('true');
		expect(elementFromPoint).toHaveBeenCalledWith(
			30, 
			40
		);
		expect(onDragCluster).toHaveBeenCalledWith(target);
	});

	it('accepts a dropped file or tab by its path', () => {
		const onDropPath = vi.fn();
		renderRow(
			buildCluster(), 
			{ 
				getDraggedPath: () => 'x.md', 
				onDropPath 
			}
		);

		fireEvent.drop(
			screen.getByRole(
				'button', 
				{ name: /Cluster A/ }
			), 
			{ dataTransfer: buildDataTransfer() }
		);

		expect(onDropPath).toHaveBeenCalledWith('x.md');
	});

	it('allows a drop only while a file or tab is being dragged', () => {
		const header = (): HTMLElement => screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		);
		renderRow(
			buildCluster(), 
			{ getDraggedPath: () => 'x.md' }
		);
		const allowed = fireEvent.dragOver(
			header(), 
			{ dataTransfer: buildDataTransfer() }
		);
		cleanup();
		renderRow(
			buildCluster(), 
			{ getDraggedPath: () => null }
		);
		const refused = fireEvent.dragOver(
			header(), 
			{ dataTransfer: buildDataTransfer() }
		);

		expect([
			allowed, 
			refused
		]).toEqual([
			false, 
			true
		]);
	});

	it('ignores a drop when nothing is being dragged', () => {
		const onDropPath = vi.fn();
		renderRow(
			buildCluster(), 
			{ 
				getDraggedPath: () => null, 
				onDropPath 
			}
		);

		fireEvent.drop(
			screen.getByRole(
				'button', 
				{ name: /Cluster A/ }
			), 
			{ dataTransfer: buildDataTransfer() }
		);

		expect(onDropPath).not.toHaveBeenCalled();
	});

	it('passes a dragged member\'s path and the drag event on', () => {
		const onDragMember = vi.fn();
		renderRow(
			buildCluster({ members: ['a.md'] }), 
			{ 
				expanded: true, 
				onDragMember 
			}
		);

		fireEvent.dragStart(
			document.querySelector('.tabcandy-member-row') as HTMLElement, 
			{ dataTransfer: buildDataTransfer() }
		);

		expect(onDragMember).toHaveBeenCalledWith(
			'a.md', 
			expect.any(Event)
		);
	});

	it('offers to resolve missing members from the drawer', () => {
		const onResolveMissing = vi.fn();
		renderRow(buildCluster({ members: [
			'a.md', 
			'gone.md'
		] }), {
			expanded: true,
			isFilePresent: (path) => path === 'a.md',
			onResolveMissing,
		});

		fireEvent.click(screen.getByRole(
			'button', 
			{ name: 'Resolve missing (1)' }
		));

		expect(onResolveMissing).toHaveBeenCalledWith();
	});

	it('omits the resolve button when nothing is missing', () => {
		renderRow(
			buildCluster({ members: ['a.md'] }), 
			{ expanded: true }
		);

		expect(screen.queryByRole(
			'button', 
			{ name: /Resolve missing/ }
		)).toBeNull();
	});

	it('resolves a single missing member from its context menu', () => {
		const onResolveMissing = vi.fn();
		const menus = captureMenus();
		renderRow(buildCluster({ members: ['gone.md'] }), {
			expanded: true,
			isFilePresent: () => false,
			onResolveMissing,
		});

		fireEvent.contextMenu(document.querySelector('.tabcandy-member-row') as HTMLElement);
		const items = menus[0].menuItems__;
		items[0].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__), 
			onResolveMissing.mock.calls
		]).toEqual([
			['Resolve missing member'],
			[['gone.md']],
		]);
	});

	it('offers Open tray from the Cluster row\'s context menu', () => {
		const onOpenTray = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(), 
			{ onOpenTray }
		);

		fireEvent.contextMenu(screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		));
		const items = menus[0].menuItems__;
		items[0].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__), 
			onOpenTray.mock.calls.length
		]).toEqual([
			[
				'Open tray', 
				'Open cluster', 
				'Edit cluster',
				'Delete cluster',
				'Pair with…'
			], 
			1
		]);
	});

	it('starts editing the Cluster when Edit cluster is chosen from the row menu', () => {
		const onEditCluster = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(),
			{ onEditCluster }
		);

		fireEvent.click(screen.getByRole(
			'button',
			{ name: 'Cluster options' }
		));
		menus[0].menuItems__[2].onClick__?.(new MouseEvent('click'));

		expect(onEditCluster).toHaveBeenCalledTimes(1);
	});

	it('starts deleting the Cluster when Delete cluster is chosen from the row menu', () => {
		const onDeleteCluster = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(),
			{ onDeleteCluster }
		);

		fireEvent.click(screen.getByRole(
			'button',
			{ name: 'Cluster options' }
		));
		menus[0].menuItems__[3].onClick__?.(new MouseEvent('click'));

		expect(onDeleteCluster).toHaveBeenCalledTimes(1);
	});

	it('offers Open tray from the Cluster options button without toggling the row', () => {
		const onOpenTray = vi.fn();
		const onToggle = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(), 
			{ 
				onOpenTray, 
				onToggle 
			}
		);

		fireEvent.click(screen.getByRole(
			'button', 
			{ name: 'Cluster options' }
		));
		const items = menus[0].menuItems__;
		items[0].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__), 
			onOpenTray.mock.calls.length, 
			onToggle.mock.calls.length
		]).toEqual([
			[
				'Open tray', 
				'Open cluster', 
				'Edit cluster',
				'Delete cluster',
				'Pair with…'
			],
			1,
			0,
		]);
	});

	it('pairs from the 🔗 icon when unpaired, without toggling the row', () => {
		const onPair = vi.fn();
		const onToggle = vi.fn();
		renderRow(
			buildCluster(), 
			{ 
				onPair, 
				onToggle 
			}
		);

		fireEvent.click(screen.getByRole(
			'button', 
			{ name: 'Pair with another cluster' }
		));

		expect([
			onPair.mock.calls.length, 
			onToggle.mock.calls.length
		]).toEqual([
			1, 
			0
		]);
	});

	it('unlinks from the 🔗 icon when paired, naming the partner', () => {
		const onUnlink = vi.fn();
		const onToggle = vi.fn();
		renderRow(buildCluster(), {
			onUnlink,
			onToggle,
			pairedName: 'Other',
		});

		const button = screen.getByRole(
			'button', 
			{ name: 'Unlink from Other' }
		);
		fireEvent.click(button);

		expect([
			button.classList.contains('is-paired'),
			onUnlink.mock.calls.length,
			onToggle.mock.calls.length,
		]).toEqual([
			true, 
			1, 
			0
		]);
	});

	it('does not mark the 🔗 icon as paired when unpaired', () => {
		renderRow(buildCluster());

		const button = screen.getByRole(
			'button', 
			{ name: 'Pair with another cluster' }
		);

		expect(button.classList.contains('is-paired')).toBe(false);
	});

	it('offers Unlink, not Pair with…, from the options button when paired', () => {
		const onConfirmUnlink = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(), 
			{ 
				onConfirmUnlink, 
				pairedName: 'Other' 
			}
		);

		fireEvent.click(screen.getByRole(
			'button', 
			{ name: 'Cluster options' }
		));
		const items = menus[0].menuItems__;
		items[4].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__), 
			onConfirmUnlink.mock.calls.length
		]).toEqual([
			[
				'Open tray', 
				'Open cluster', 
				'Edit cluster',
				'Delete cluster',
				'Unlink'
			], 
			1
		]);
	});

	it('opens the Cluster from the row menu', () => {
		const onOpenCluster = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(), 
			{ onOpenCluster }
		);

		fireEvent.contextMenu(screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		));
		menus[0].menuItems__[1].onClick__?.(new MouseEvent('click'));

		expect(onOpenCluster).toHaveBeenCalledTimes(1);
	});

	it('offers Close cluster only while a member is open', () => {
		const onCloseCluster = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster(), 
			{ 
				hasOpenMember: () => true, 
				onCloseCluster 
			}
		);

		fireEvent.contextMenu(screen.getByRole(
			'button', 
			{ name: /Cluster A/ }
		));
		const items = menus[0].menuItems__;
		items[2].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__), 
			onCloseCluster.mock.calls.length
		]).toEqual([
			[
				'Open tray', 
				'Open cluster', 
				'Close cluster', 
				'Edit cluster',
				'Delete cluster',
				'Pair with…'
			],
			1,
		]);
	});

	it('offers Move down from the first member\'s options button', () => {
		const onMoveMember = vi.fn();
		const menus = captureMenus();
		renderRow(
			buildCluster({ members: [
				'a.md', 
				'b.md'
			] }), 
			{ 
				expanded: true, 
				onMoveMember 
			}
		);

		fireEvent.click(screen.getAllByRole(
			'button', 
			{ name: 'Member options' }
		)[0]);
		const items = menus[0].menuItems__;
		items[0].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__), 
			onMoveMember.mock.calls
		]).toEqual([
			['Move down'],
			[[
				0, 
				1
			]],
		]);
	});

	it('leaves out the member options button when the menu would be empty', () => {
		renderRow(
			buildCluster({ members: ['a.md'] }),
			{ expanded: true }
		);

		expect(screen.queryByRole(
			'button',
			{ name: 'Member options' }
		)).toBeNull();
	});
});

describe('SearchButton', () => {
	it('renders the icon before the label when iconFirst is set', () => {
		addIcon(
			'search',
			'<path d="search-icon" />'
		);
		render(<SearchButton
			label = 'Search'
			iconName = 'search'
			iconFirst = { true }
			className = 'a'
			textClassName = 'b'
			onClick = { () => {} }
		/>);

		const button = screen.getByText('Search').closest('button');
		if (!button) {
			throw new Error('Expected the search button to render as a button');
		}
		const children = Array.from(button.children);
		expect(children[0].className).toBe('tabcandy-icon');
		expect(children[1].textContent).toBe('Search');
	});

	it('renders the icon after the label when iconFirst is unset', () => {
		addIcon(
			'search',
			'<path d="search-icon" />'
		);
		render(<SearchButton
			label = 'Search'
			iconName = 'search'
			className = 'a'
			textClassName = 'b'
			onClick = { () => {} }
		/>);

		const button = screen.getByText('Search').closest('button');
		if (!button) {
			throw new Error('Expected the search button to render as a button');
		}
		const children = Array.from(button.children);
		expect(children[0].textContent).toBe('Search');
		expect(children[1].className).toBe('tabcandy-icon');
	});

	it('fires onClick when clicked', () => {
		const onClick = vi.fn();
		render(<SearchButton
			label = 'Search'
			iconName = 'search'
			className = 'a'
			textClassName = 'b'
			onClick = { onClick }
		/>);

		fireEvent.click(screen.getByText('Search'));

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe('RecentFiles', () => {
	it('renders an empty wrapper when there are no files', () => {
		const { container } = render(<RecentFiles files = { [] } onOpen = { () => {} } />);

		const wrapper = container.querySelector('.tabcandy-dashboard-centeredrow');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.children.length).toBe(0);
	});

	it('renders one entry per file and opens the right one on click', () => {
		const fileOne = buildFile('Notes/one.md');
		const fileTwo = buildFile('Notes/two.md');
		const onOpen = vi.fn();
		render(<RecentFiles files = { [
			fileOne,
			fileTwo
		] } onOpen = { onOpen } />);

		expect(screen.getByText('one')).not.toBeNull();
		fireEvent.click(screen.getByText('two'));

		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledWith(fileTwo);
	});
});

describe('Bookmarks', () => {
	it('renders an empty wrapper when there are no bookmarked files', () => {
		const { container } = render(<Bookmarks files = { [] } onOpen = { () => {} } />);

		const wrapper = container.querySelector('.tabcandy-dashboard-centeredrow');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.children.length).toBe(0);
	});

	it('renders one entry per bookmarked file and opens the right one on click', () => {
		const fileOne = buildFile('Notes/one.md');
		const fileTwo = buildFile('Notes/two.md');
		const onOpen = vi.fn();
		render(<Bookmarks files = { [
			fileOne,
			fileTwo
		] } onOpen = { onOpen } />);

		expect(screen.getByText('one')).not.toBeNull();
		fireEvent.click(screen.getByText('two'));

		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledWith(fileTwo);
	});
});

describe('RecentlyClosedTabs', () => {
	it('renders an empty wrapper when there are no closed tabs', () => {
		const { container } = render(<RecentlyClosedTabs entries = { [] } onOpen = { () => {} } />);

		const wrapper = container.querySelector('.tabcandy-dashboard-centeredrow');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.children.length).toBe(0);
	});

	it('renders one entry per closed tab and opens the right one on click', () => {
		const entryOne: ClosedTabEntry = {
			viewState: {
				type: 'markdown',
				state: { file: 'One.md' }
			},
			title: 'Untitled',
		};
		const entryTwo: ClosedTabEntry = {
			viewState: {
				type: 'markdown',
				state: { file: 'Two.md' }
			},
			title: 'Untitled',
		};
		const onOpen = vi.fn();
		render(<RecentlyClosedTabs entries = { [
			entryOne,
			entryTwo
		] } onOpen = { onOpen } />);

		expect(screen.getAllByText('Untitled')).toHaveLength(2);
		fireEvent.click(screen.getAllByText('Untitled')[1]);

		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledWith(entryTwo);
	});
});

describe('QuoteDisplay', () => {
	it('renders the quote and author when a quote is present and show is true', () => {
		render(<QuoteDisplay
			quote = {{
				content: 'Be water.',
				author: 'Bruce Lee'
			}}
			show = { true }
		/>);

		expect(screen.getByText('"Be water."')).not.toBeNull();
		expect(screen.getByText('Bruce Lee')).not.toBeNull();
	});

	it('renders nothing when there is no quote yet, even if show is true', () => {
		const { container } = render(<QuoteDisplay quote = { null } show = { true } />);

		expect(container.querySelector('.tabcandy-quote-content')).toBeNull();
	});

	it('renders nothing when show is false, even with a quote available', () => {
		const { container } = render(<QuoteDisplay
			quote = {{
				content: 'Be water.',
				author: 'Bruce Lee'
			}}
			show = { false }
		/>);

		expect(container.querySelector('.tabcandy-quote-content')).toBeNull();
	});
});

describe('BackgroundSurface', () => {
	/**
	 * Renders a `BackgroundSurface` with defaults unless overridden.
	 *
	 * @param props - Props to replace.
	 * @returns The render result.
	 */
	function renderSurface(props: Partial<Parameters<typeof BackgroundSurface>[0]> = {}) {
		return render(<BackgroundSurface
			background = { undefined }
			transparent = { false }
			transparentWithShadows = { false }
			onKeyDown = { () => {} }
			containerRef = { createRef<HTMLDivElement>() }
			{ ...props }
		>
			<span>content</span>
		</BackgroundSurface>);
	}

	it('applies the transparent class when the transparent theme is active', () => {
		const { container } = renderSurface({ transparent: true });

		expect(container.firstElementChild?.className).toContain('tabcandy-root--transparent');
		expect(container.firstElementChild?.className).not.toContain('tabcandy-root--transparentWithShadows');
	});

	it('applies the transparentWithShadows class when that theme is active', () => {
		const { container } = renderSurface({ transparentWithShadows: true });

		expect(container.firstElementChild?.className).toContain('tabcandy-root--transparentWithShadows');
	});

	it('applies neither theme class when both flags are off', () => {
		const { container } = renderSurface();

		expect(container.firstElementChild?.className.trim()).toBe('tabcandy-root');
	});

	it('sets the background image inline style when a background is provided', () => {
		const { container } = renderSurface({ background: 'app://local/bg.png' });

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.backgroundImage).toContain('app://local/bg.png');
	});

	it('leaves the inline style unset when there is no background', () => {
		const { container } = renderSurface({ background: null });

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.backgroundImage).toBe('');
	});

	it('sets the inline text color when overlayTextColor is provided', () => {
		const { container } = renderSurface({ overlayTextColor: '#123456' });

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.color).toBe('rgb(18, 52, 86)');
	});

	it('leaves the inline text color unset when overlayTextColor is null', () => {
		const { container } = renderSurface({ overlayTextColor: null });

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.color).toBe('');
	});

	it('sets both the background image and the text color together', () => {
		const { container } = renderSurface({
			background: 'app://local/bg.png',
			overlayTextColor: '#123456',
		});

		const root = container.firstElementChild as HTMLElement;
		expect(root.style.backgroundImage).toContain('app://local/bg.png');
		expect(root.style.color).toBe('rgb(18, 52, 86)');
	});

	it('fires onKeyDown through to the caller', () => {
		const onKeyDown = vi.fn();
		const { container } = renderSurface({ onKeyDown });

		fireEvent.keyDown(
			container.firstElementChild as HTMLElement,
			{ key: 'a' }
		);

		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it('renders its children', () => {
		renderSurface();

		expect(screen.getByText('content')).not.toBeNull();
	});
});

describe('Icon', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the resolved icon element', () => {
		addIcon(
			'tabcandy-test-icon',
			'<path d="M0 0h10v10H0z" />'
		);
		const { container } = render(<Icon name = 'tabcandy-test-icon' />);

		expect(container.querySelector('span.tabcandy-icon svg')).not.toBeNull();
	});

	it('renders an empty span, without throwing, when the icon name does not resolve', () => {
		const { container } = render(<Icon name = 'not-a-real-icon' />);

		const span = container.querySelector('span.tabcandy-icon');
		expect(span).not.toBeNull();
		expect(span?.childElementCount).toBe(0);
	});

	it('swaps the icon rather than appending alongside the old one when name changes', () => {
		addIcon(
			'tabcandy-icon-a',
			'<path d="a" />'
		);
		addIcon(
			'tabcandy-icon-b',
			'<path d="b" />'
		);
		const {
			container,
			rerender
		} = render(<Icon name = 'tabcandy-icon-a' />);

		rerender(<Icon name = 'tabcandy-icon-b' />);

		const span = container.querySelector('span.tabcandy-icon');
		expect(span?.childElementCount).toBe(1);
	});
});

describe('MemberRow', () => {
	it('labels the row with the file name without its extension', () => {
		render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'Notes/Reading list.md'
			exists = { true }
			onOpen = { () => {} }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);

		expect(screen.getByText('Reading list')).toBeTruthy();
	});

	it('keeps the whole name when the file has no extension', () => {
		render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'Notes/README'
			exists = { true }
			onOpen = { () => {} }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);

		expect(screen.getByText('README')).toBeTruthy();
	});

	it('shows the full path as the title of a present file', () => {
		render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'Notes/a.md'
			exists = { true }
			onOpen = { () => {} }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);

		expect(screen.getByText('a').getAttribute('title')).toBe('Notes/a.md');
	});

	it('marks a missing file as unresolved and says so in its title', () => {
		const { container } = render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'Notes/a.md'
			exists = { false }
			onOpen = { () => {} }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);

		expect([
			container.querySelector('.is-unresolved') !== null,
			screen.getByText('a').getAttribute('title'),
		]).toEqual([
			true,
			'Notes/a.md (file not found)'
		]);
	});

	it('does not mark a present file as unresolved', () => {
		const { container } = render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'a.md'
			exists = { true }
			onOpen = { () => {} }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);

		expect(container.querySelector('.is-unresolved')).toBeNull();
	});

	it('opens the member when the title is clicked', () => {
		const onOpen = vi.fn();
		render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'a.md'
			exists = { true }
			onOpen = { onOpen }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);

		fireEvent.click(screen.getByText('a'));

		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it('removes the member when the minus button is clicked, without opening it', () => {
		const onOpen = vi.fn();
		const onRemove = vi.fn();
		render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'a.md'
			exists = { true }
			onOpen = { onOpen }
			onRemove = { onRemove }
			onResolve = { () => {} }
		/>);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect([
			onRemove.mock.calls.length,
			onOpen.mock.calls.length
		]).toEqual([
			1,
			0
		]);
	});

	it('removes a missing member the same way', () => {
		const onRemove = vi.fn();
		render(<MemberRow
			clusterId = 'a'
			count = { 1 }
			index = { 0 }
			onDragOut = { () => {} }
			onMove = { () => {} }
			path = 'a.md'
			exists = { false }
			onOpen = { () => {} }
			onRemove = { onRemove }
			onResolve = { () => {} }
		/>);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	/**
	 * Renders a row at `index` of `count` members.
	 *
	 * @param index - Position of the member.
	 * @param count - Number of members in the Cluster.
	 * @param onMove - Called when the member is moved.
	 * @returns The row element.
	 */
	function renderMovableRow(
		index: number,
		count: number,
		onMove: (
			fromIndex: number,
			toIndex: number
		) => void
	): HTMLElement {
		const { container } = render(<MemberRow
			clusterId = 'a'
			count = { count }
			index = { index }
			path = 'x.md'
			exists = { true }
			onDragOut = { () => {} }
			onMove = { onMove }
			onOpen = { () => {} }
			onRemove = { () => {} }
			onResolve = { () => {} }
		/>);
		return container.querySelector('.tabcandy-member-row') as HTMLElement;
	}

	it('is draggable', () => {
		const row = renderMovableRow(
			0,
			1,
			() => {}
		);

		expect(row.getAttribute('draggable')).toBe('true');
	});

	it('moves a member dropped from another position in the same Cluster', () => {
		const onMove = vi.fn();
		const row = renderMovableRow(
			2,
			3,
			onMove
		);
		const dataTransfer = buildDataTransfer();
		dataTransfer.setData(
			'application/x-tabcandy-member',
			JSON.stringify({
				clusterId: 'a',
				index: 0
			})
		);

		fireEvent.drop(
			row,
			{ dataTransfer }
		);

		expect(onMove).toHaveBeenCalledWith(
			0,
			2
		);
	});

	it('ignores a member dragged from another Cluster', () => {
		const onMove = vi.fn();
		const row = renderMovableRow(
			1,
			3,
			onMove
		);
		const dataTransfer = buildDataTransfer();
		dataTransfer.setData(
			'application/x-tabcandy-member',
			JSON.stringify({
				clusterId: 'b',
				index: 0
			})
		);

		fireEvent.drop(
			row,
			{ dataTransfer }
		);

		expect(onMove).not.toHaveBeenCalled();
	});

	it('ignores a drop that is not a member', () => {
		const onMove = vi.fn();
		const row = renderMovableRow(
			1,
			3,
			onMove
		);

		fireEvent.drop(
			row,
			{ dataTransfer: buildDataTransfer() }
		);

		expect(onMove).not.toHaveBeenCalled();
	});

	it('describes itself on drag start', () => {
		const row = renderMovableRow(
			1,
			3,
			() => {}
		);
		const dataTransfer = buildDataTransfer();

		fireEvent.dragStart(
			row,
			{ dataTransfer }
		);

		expect(JSON.parse(dataTransfer.getData('application/x-tabcandy-member'))).toEqual({
			clusterId: 'a',
			index: 1
		});
	});

	it('offers Move up and Move down from the middle of the list', () => {
		const onMove = vi.fn();
		const menus = captureMenus();
		const row = renderMovableRow(
			1,
			3,
			onMove
		);

		fireEvent.contextMenu(row);
		const items = menus[0].menuItems__;
		items[0].onClick__?.(new MouseEvent('click'));
		items[1].onClick__?.(new MouseEvent('click'));

		expect([
			items.map((item) => item.title__),
			onMove.mock.calls
		]).toEqual([
			[
				'Move up',
				'Move down'
			],
			[
				[
					1,
					0
				],
				[
					1,
					2
				]
			]
		]);
	});

	it('offers only Move down on the first row and only Move up on the last', () => {
		const menus = captureMenus();
		const first = renderMovableRow(
			0,
			2,
			() => {}
		);
		fireEvent.contextMenu(first);
		cleanup();
		const last = renderMovableRow(
			1,
			2,
			() => {}
		);
		fireEvent.contextMenu(last);

		expect(menus.map((menu) => menu.menuItems__.map((item) => item.title__))).toEqual([
			['Move down'],
			['Move up']
		]);
	});
});