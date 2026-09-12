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
import { createConfiguredApp } from '../test/fakes';
import {
	BackgroundSurface,
	Bookmarks,
	Icon,
	QuoteDisplay,
	RecentFiles,
	SearchButton
} from './components';

function buildFile(path: string): TFile {
	const app = createConfiguredApp({ files: { [path]: '' } });
	const file = app.vault.getAbstractFileByPath(path);
	if (!(file instanceof TFile)) {
		throw new Error(`Expected '${path}' to resolve to a TFile in the fake vault`);
	}
	return file;
}

// testing-library's own auto-cleanup registers itself against a global
// `afterEach`, which this project doesn't enable (tests import their
// hooks explicitly from `vitest` rather than relying on globals) - without
// this, each render() in this file would keep piling onto the same
// jsdom `document.body` across tests.
afterEach(cleanup);

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

		const wrapper = container.querySelector('.tabcandy-recentlyedited');
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

		const wrapper = container.querySelector('.tabcandy-recentlyedited');
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
