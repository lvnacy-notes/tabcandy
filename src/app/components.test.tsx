/** @file Tests for the app components. */
import {
	afterEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { createRef } from 'react';
import {
	fireEvent,
	render,
	screen,
	cleanup
} from '@testing-library/react';
import { addIcon, TFile } from 'obsidian';
import { ClosedTabEntry, TabCandyCluster } from '../types';
import { buildCluster, createConfiguredApp } from '../test/fakes';
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
	return render(
		<ClusterRow
			cluster = { cluster }
			expanded = { false }
			isFilePresent = { () => true }
			onOpenMember = { () => {} }
			onRemoveMember = { () => {} }
			onToggle = { () => {} }
			{ ...overrides }
		/>
	);
}

describe('ClusterRow', () => {
	it('shows the Cluster\'s name and member count', () => {
		renderRow(buildCluster({ name: 'Reading', members: ['a.md', 'b.md'] }));

		expect([screen.getByText('Reading').textContent, screen.getByText('2').textContent]).toEqual(['Reading', '2']);
	});

	it('hides the members while collapsed', () => {
		renderRow(buildCluster({ members: ['a.md'] }));

		expect(screen.queryByText('a')).toBeNull();
	});

	it('lists the members in order while expanded', () => {
		const { container } = renderRow(
			buildCluster({ members: ['b.md', 'a.md'] }),
			{ expanded: true }
		);

		const titles = Array.from(container.querySelectorAll('.tabcandy-member-title'))
			.map((title) => title.textContent);

		expect(titles).toEqual(['b', 'a']);
	});

	it('says there are no tabs when an expanded Cluster is empty', () => {
		renderRow(buildCluster(), { expanded: true });

		expect(screen.getByText('No tabs yet.')).toBeTruthy();
	});

	it('marks only the members whose files are missing', () => {
		const { container } = renderRow(
			buildCluster({ members: ['here.md', 'gone.md'] }),
			{
				expanded: true,
				isFilePresent: (path) => path === 'here.md',
			}
		);

		const unresolved = Array.from(container.querySelectorAll('.is-unresolved'))
			.map((row) => row.textContent);

		expect(unresolved).toEqual(['gone−']);
	});

	it('reports the expanded state to assistive technology', () => {
		renderRow(buildCluster(), { expanded: true });

		expect(screen.getByRole('button', { name: /Cluster A/ }).getAttribute('aria-expanded')).toBe('true');
	});

	it('toggles when the header is clicked', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.click(screen.getByText('Cluster A'));

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('toggles when Enter is pressed on the header', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.keyDown(screen.getByRole('button', { name: /Cluster A/ }), { key: 'Enter' });

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('toggles when Space is pressed on the header', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.keyDown(screen.getByRole('button', { name: /Cluster A/ }), { key: ' ' });

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('does not toggle on other keys', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.keyDown(screen.getByRole('button', { name: /Cluster A/ }), { key: 'a' });

		expect(onToggle).not.toHaveBeenCalled();
	});

	it('exposes the Flavor to CSS', () => {
		renderRow(buildCluster({ flavor: '#ff0000' }));

		const header = screen.getByRole('button', { name: /Cluster A/ });

		expect(header.style.getPropertyValue('--tabcandy-flavor')).toBe('#ff0000');
	});

	it('sets no Flavor variable for a Cluster without one', () => {
		renderRow(buildCluster());

		const header = screen.getByRole('button', { name: /Cluster A/ });

		expect(header.style.getPropertyValue('--tabcandy-flavor')).toBe('');
	});

	it('opens the clicked member by path', () => {
		const onOpenMember = vi.fn();
		renderRow(
			buildCluster({ members: ['Notes/a.md'] }),
			{ expanded: true, onOpenMember }
		);

		fireEvent.click(screen.getByText('a'));

		expect(onOpenMember).toHaveBeenCalledWith('Notes/a.md');
	});

	it('removes the clicked member by path', () => {
		const onRemoveMember = vi.fn();
		renderRow(
			buildCluster({ members: ['Notes/a.md'] }),
			{ expanded: true, onRemoveMember }
		);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect(onRemoveMember).toHaveBeenCalledWith('Notes/a.md');
	});
});

describe('SearchButton', () => {
	it('renders the icon before the label when iconFirst is set', () => {
		addIcon('search', '<path d="search-icon" />');
		render(
			<SearchButton
				label = 'Search'
				iconName = 'search'
				iconFirst = { true }
				className = 'a'
				textClassName = 'b'
				onClick = { () => {} }
			/>
		);

		const button = screen.getByText('Search').closest('button');
		if (!button) {
			throw new Error('Expected the search button to render as a button');
		}
		const children = Array.from(button.children);
		expect(children[0].className).toBe('tabcandy-icon');
		expect(children[1].textContent).toBe('Search');
	});

	it('renders the icon after the label when iconFirst is unset', () => {
		addIcon('search', '<path d="search-icon" />');
		render(
			<SearchButton
				label = 'Search'
				iconName = 'search'
				className = 'a'
				textClassName = 'b'
				onClick = { () => {} }
			/>
		);

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
		render(
			<SearchButton
				label = 'Search'
				iconName = 'search'
				className = 'a'
				textClassName = 'b'
				onClick = { onClick }
			/>
		);

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
		render(<RecentFiles files = { [fileOne, fileTwo] } onOpen = { onOpen } />);

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
		render(<Bookmarks files = { [fileOne, fileTwo] } onOpen = { onOpen } />);

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
			viewState: { type: 'markdown', state: { file: 'One.md' } },
			title: 'Untitled',
		};
		const entryTwo: ClosedTabEntry = {
			viewState: { type: 'markdown', state: { file: 'Two.md' } },
			title: 'Untitled',
		};
		const onOpen = vi.fn();
		render(<RecentlyClosedTabs entries = { [entryOne, entryTwo] } onOpen = { onOpen } />);

		expect(screen.getAllByText('Untitled')).toHaveLength(2);
		fireEvent.click(screen.getAllByText('Untitled')[1]);

		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledWith(entryTwo);
	});
});

describe('QuoteDisplay', () => {
	it('renders the quote and author when a quote is present and show is true', () => {
		render(
			<QuoteDisplay
				quote = {{ content: 'Be water.', author: 'Bruce Lee' }}
				show = { true }
			/>
		);

		expect(screen.getByText('"Be water."')).not.toBeNull();
		expect(screen.getByText('Bruce Lee')).not.toBeNull();
	});

	it('renders nothing when there is no quote yet, even if show is true', () => {
		const { container } = render(<QuoteDisplay quote = { null } show = { true } />);

		expect(container.querySelector('.tabcandy-quote-content')).toBeNull();
	});

	it('renders nothing when show is false, even with a quote available', () => {
		const { container } = render(
			<QuoteDisplay
				quote = {{ content: 'Be water.', author: 'Bruce Lee' }}
				show = { false }
			/>
		);

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
		return render(
			<BackgroundSurface
				background = { undefined }
				transparent = { false }
				transparentWithShadows = { false }
				onKeyDown = { () => {} }
				containerRef = { createRef<HTMLDivElement>() }
				{ ...props }
			>
				<span>content</span>
			</BackgroundSurface>
		);
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

		fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'a' });

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
		addIcon('tabcandy-test-icon', '<path d="M0 0h10v10H0z" />');
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
		addIcon('tabcandy-icon-a', '<path d="a" />');
		addIcon('tabcandy-icon-b', '<path d="b" />');
		const { container, rerender } = render(<Icon name = 'tabcandy-icon-a' />);

		rerender(<Icon name = 'tabcandy-icon-b' />);

		const span = container.querySelector('span.tabcandy-icon');
		expect(span?.childElementCount).toBe(1);
	});
});

describe('MemberRow', () => {
	it('labels the row with the file name without its extension', () => {
		render(
			<MemberRow
				path = 'Notes/Reading list.md'
				exists = { true }
				onOpen = { () => {} }
				onRemove = { () => {} }
			/>
		);

		expect(screen.getByText('Reading list')).toBeTruthy();
	});

	it('keeps the whole name when the file has no extension', () => {
		render(
			<MemberRow
				path = 'Notes/README'
				exists = { true }
				onOpen = { () => {} }
				onRemove = { () => {} }
			/>
		);

		expect(screen.getByText('README')).toBeTruthy();
	});

	it('shows the full path as the title of a present file', () => {
		render(
			<MemberRow
				path = 'Notes/a.md'
				exists = { true }
				onOpen = { () => {} }
				onRemove = { () => {} }
			/>
		);

		expect(screen.getByText('a').getAttribute('title')).toBe('Notes/a.md');
	});

	it('marks a missing file as unresolved and says so in its title', () => {
		const { container } = render(
			<MemberRow
				path = 'Notes/a.md'
				exists = { false }
				onOpen = { () => {} }
				onRemove = { () => {} }
			/>
		);

		expect([
			container.querySelector('.is-unresolved') !== null,
			screen.getByText('a').getAttribute('title'),
		]).toEqual([true, 'Notes/a.md (file not found)']);
	});

	it('does not mark a present file as unresolved', () => {
		const { container } = render(
			<MemberRow
				path = 'a.md'
				exists = { true }
				onOpen = { () => {} }
				onRemove = { () => {} }
			/>
		);

		expect(container.querySelector('.is-unresolved')).toBeNull();
	});

	it('opens the member when the title is clicked', () => {
		const onOpen = vi.fn();
		render(
			<MemberRow
				path = 'a.md'
				exists = { true }
				onOpen = { onOpen }
				onRemove = { () => {} }
			/>
		);

		fireEvent.click(screen.getByText('a'));

		expect(onOpen).toHaveBeenCalledTimes(1);
	});

	it('removes the member when the minus button is clicked, without opening it', () => {
		const onOpen = vi.fn();
		const onRemove = vi.fn();
		render(
			<MemberRow
				path = 'a.md'
				exists = { true }
				onOpen = { onOpen }
				onRemove = { onRemove }
			/>
		);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect([onRemove.mock.calls.length, onOpen.mock.calls.length]).toEqual([1, 0]);
	});

	it('removes a missing member the same way', () => {
		const onRemove = vi.fn();
		render(
			<MemberRow
				path = 'a.md'
				exists = { false }
				onOpen = { () => {} }
				onRemove = { onRemove }
			/>
		);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect(onRemove).toHaveBeenCalledTimes(1);
	});
});

describe('ClusterRow', () => {
	it('shows the Cluster\'s name and member count', () => {
		renderRow(buildCluster({ name: 'Reading', members: ['a.md', 'b.md'] }));

		expect([screen.getByText('Reading').textContent, screen.getByText('2').textContent]).toEqual(['Reading', '2']);
	});

	it('hides the members while collapsed', () => {
		renderRow(buildCluster({ members: ['a.md'] }));

		expect(screen.queryByText('a')).toBeNull();
	});

	it('lists the members in order while expanded', () => {
		const { container } = renderRow(
			buildCluster({ members: ['b.md', 'a.md'] }),
			{ expanded: true }
		);

		const titles = Array.from(container.querySelectorAll('.tabcandy-member-title'))
			.map((title) => title.textContent);

		expect(titles).toEqual(['b', 'a']);
	});

	it('says there are no tabs when an expanded Cluster is empty', () => {
		renderRow(buildCluster(), { expanded: true });

		expect(screen.getByText('No tabs yet.')).toBeTruthy();
	});

	it('marks only the members whose files are missing', () => {
		const { container } = renderRow(
			buildCluster({ members: ['here.md', 'gone.md'] }),
			{
				expanded: true,
				isFilePresent: (path) => path === 'here.md',
			}
		);

		const unresolved = Array.from(container.querySelectorAll('.is-unresolved'))
			.map((row) => row.textContent);

		expect(unresolved).toEqual(['gone−']);
	});

	it('reports the expanded state to assistive technology', () => {
		renderRow(buildCluster(), { expanded: true });

		expect(screen.getByRole('button', { name: /Cluster A/ }).getAttribute('aria-expanded')).toBe('true');
	});

	it('toggles when the header is clicked', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.click(screen.getByText('Cluster A'));

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('toggles when Enter is pressed on the header', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.keyDown(screen.getByRole('button', { name: /Cluster A/ }), { key: 'Enter' });

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('toggles when Space is pressed on the header', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.keyDown(screen.getByRole('button', { name: /Cluster A/ }), { key: ' ' });

		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it('does not toggle on other keys', () => {
		const onToggle = vi.fn();
		renderRow(buildCluster(), { onToggle });

		fireEvent.keyDown(screen.getByRole('button', { name: /Cluster A/ }), { key: 'a' });

		expect(onToggle).not.toHaveBeenCalled();
	});

	it('exposes the Flavor to CSS', () => {
		renderRow(buildCluster({ flavor: '#ff0000' }));

		const header = screen.getByRole('button', { name: /Cluster A/ });

		expect(header.style.getPropertyValue('--tabcandy-flavor')).toBe('#ff0000');
	});

	it('sets no Flavor variable for a Cluster without one', () => {
		renderRow(buildCluster());

		const header = screen.getByRole('button', { name: /Cluster A/ });

		expect(header.style.getPropertyValue('--tabcandy-flavor')).toBe('');
	});

	it('opens the clicked member by path', () => {
		const onOpenMember = vi.fn();
		renderRow(
			buildCluster({ members: ['Notes/a.md'] }),
			{ expanded: true, onOpenMember }
		);

		fireEvent.click(screen.getByText('a'));

		expect(onOpenMember).toHaveBeenCalledWith('Notes/a.md');
	});

	it('removes the clicked member by path', () => {
		const onRemoveMember = vi.fn();
		renderRow(
			buildCluster({ members: ['Notes/a.md'] }),
			{ expanded: true, onRemoveMember }
		);

		fireEvent.click(screen.getByLabelText('Remove from cluster'));

		expect(onRemoveMember).toHaveBeenCalledWith('Notes/a.md');
	});
});