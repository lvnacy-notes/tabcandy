/** @file Tests for pruning a captured layout and planning its restore. */
import {
	describe,
	expect,
	it
} from 'vitest';
import {
	flattenPlan,
	getPlanPaths,
	planRestore,
	pruneLayout
} from './layoutSnapshot';
import type { LayoutNode } from '../types';

/**
 * Builds a leaf node showing a file.
 *
 * @param path - The file path.
 * @returns The node.
 */
function leaf(path: string): LayoutNode {
	return {
		id: `leaf-${ path }`,
		type: 'leaf',
		state: { type: 'markdown', state: { file: path } },
	};
}

/**
 * Builds a tab group.
 *
 * @param children - The leaves.
 * @returns The node.
 */
function tabs(...children: LayoutNode[]): LayoutNode {
	return {
		id: 'tabs',
		type: 'tabs',
		currentTab: 0,
		children,
	};
}

/**
 * Builds a split.
 *
 * @param direction - The split direction.
 * @param children - The child nodes.
 * @returns The node.
 */
function split(direction: string, ...children: LayoutNode[]): LayoutNode {
	return {
		id: 'split',
		type: 'split',
		direction,
		children,
	};
}

/**
 * Builds a predicate over a set of paths.
 *
 * @param paths - The open paths.
 * @returns The predicate.
 */
function open(...paths: string[]): (path: string) => boolean {
	return (path) => paths.includes(path);
}

describe('pruneLayout', () => {
	it('keeps the open members in tab order and strips ids and the current tab', () => {
		const result = pruneLayout(tabs(leaf('a.md'), leaf('b.md')), open('a.md', 'b.md'));

		expect(result).toEqual({
			type: 'tabs',
			children: [
				{ type: 'leaf', state: { type: 'markdown', state: { file: 'a.md' } } },
				{ type: 'leaf', state: { type: 'markdown', state: { file: 'b.md' } } },
			],
		});
	});

	it('drops leaves that are not open members', () => {
		const result = pruneLayout(tabs(leaf('a.md'), leaf('other.md')), open('a.md'));

		expect(result?.['children']).toEqual([{ type: 'leaf', state: { type: 'markdown', state: { file: 'a.md' } } }]);
	});

	it('drops a leaf with no file', () => {
		const result = pruneLayout(tabs({ id: 'x', type: 'leaf', state: { type: 'graph', state: {} } }, leaf('a.md')), open('a.md'));

		expect((result?.['children'] as LayoutNode[]).length).toBe(1);
	});

	it('drops groups left empty', () => {
		const result = pruneLayout(split('vertical', tabs(leaf('a.md')), tabs(leaf('other.md'))), open('a.md'));

		expect(result?.['type']).toBe('tabs');
	});

	it('collapses a split left with one child into that child', () => {
		const result = pruneLayout(split('vertical', tabs(leaf('a.md')), tabs(leaf('other.md'))), open('a.md'));

		expect(result).toEqual({
			type: 'tabs',
			children: [{ type: 'leaf', state: { type: 'markdown', state: { file: 'a.md' } } }],
		});
	});

	it('keeps the direction of a split that still has several children', () => {
		const result = pruneLayout(split('horizontal', tabs(leaf('a.md')), tabs(leaf('b.md'))), open('a.md', 'b.md'));

		expect(result?.['direction']).toBe('horizontal');
	});

	it('returns null when no open member is in the layout', () => {
		const result = pruneLayout(split('vertical', tabs(leaf('other.md'))), open('a.md'));

		expect(result).toBeNull();
	});

	it('returns null for something that is not a node', () => {
		expect(pruneLayout('nope', open('a.md'))).toBeNull();
	});

	it('does not change the layout it is given', () => {
		const layout = tabs(leaf('a.md'));

		pruneLayout(layout, open('a.md'));

		expect(layout['id']).toBe('tabs');
	});
});

describe('planRestore', () => {
	it('plans a tab group with its placeable paths in order', () => {
		const plan = planRestore(tabs(leaf('a.md'), leaf('b.md')), new Set(['a.md', 'b.md']));

		expect(plan).toEqual({ kind: 'tabs', paths: ['a.md', 'b.md'] });
	});

	it('leaves out paths that are not placeable', () => {
		const plan = planRestore(tabs(leaf('a.md'), leaf('gone.md')), new Set(['a.md']));

		expect(plan).toEqual({ kind: 'tabs', paths: ['a.md'] });
	});

	it('plans a split with its direction and its groups', () => {
		const plan = planRestore(split('horizontal', tabs(leaf('a.md')), tabs(leaf('b.md'))), new Set(['a.md', 'b.md']));

		expect(plan).toEqual({
			kind: 'split',
			direction: 'horizontal',
			children: [{ kind: 'tabs', paths: ['a.md'] }, { kind: 'tabs', paths: ['b.md'] }],
		});
	});

	it('drops a group that would be empty and collapses the split left with one child', () => {
		const plan = planRestore(split('vertical', tabs(leaf('a.md')), tabs(leaf('b.md'))), new Set(['b.md']));

		expect(plan).toEqual({ kind: 'tabs', paths: ['b.md'] });
	});

	it('plans a path once even when the snapshot holds it twice', () => {
		const plan = planRestore(split('vertical', tabs(leaf('a.md')), tabs(leaf('a.md'), leaf('b.md'))), new Set(['a.md', 'b.md']));

		expect(plan).toEqual({
			kind: 'split',
			direction: 'vertical',
			children: [{ kind: 'tabs', paths: ['a.md'] }, { kind: 'tabs', paths: ['b.md'] }],
		});
	});

	it('plans a bare leaf as a one-tab group', () => {
		const plan = planRestore(leaf('a.md'), new Set(['a.md']));

		expect(plan).toEqual({ kind: 'tabs', paths: ['a.md'] });
	});

	it('returns null when nothing can be placed', () => {
		const plan = planRestore(tabs(leaf('a.md')), new Set<string>());

		expect(plan).toBeNull();
	});
});

describe('flattenPlan', () => {
	it('turns nested splits into one split of the groups in order, in the root direction', () => {
		const plan = flattenPlan({
			kind: 'split',
			direction: 'horizontal',
			children: [
				{ kind: 'tabs', paths: ['a.md'] },
				{
					kind: 'split',
					direction: 'vertical',
					children: [{ kind: 'tabs', paths: ['b.md'] }, { kind: 'tabs', paths: ['c.md'] }],
				},
			],
		});

		expect(plan).toEqual({
			kind: 'split',
			direction: 'horizontal',
			children: [{ kind: 'tabs', paths: ['a.md'] }, { kind: 'tabs', paths: ['b.md'] }, { kind: 'tabs', paths: ['c.md'] }],
		});
	});

	it('leaves a tab group as it is', () => {
		const plan = flattenPlan({ kind: 'tabs', paths: ['a.md'] });

		expect(plan).toEqual({ kind: 'tabs', paths: ['a.md'] });
	});
});

describe('getPlanPaths', () => {
	it('lists every path in order', () => {
		const paths = getPlanPaths({
			kind: 'split',
			direction: 'vertical',
			children: [{ kind: 'tabs', paths: ['a.md', 'b.md'] }, { kind: 'tabs', paths: ['c.md'] }],
		});

		expect(paths).toEqual(['a.md', 'b.md', 'c.md']);
	});
});