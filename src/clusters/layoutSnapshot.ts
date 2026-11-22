/** @file Pure operations on a Cluster's layout snapshot: pruning a captured layout and planning its restore. */
import type {
	LayoutNode,
	RestorePlan,
	TabGroupPlan
} from '../types';
import { isRecord } from '../utils/typeGuards';

/**
 * Reads the file path a leaf node shows.
 *
 * @param node - A layout node.
 * @returns The path, or null when the node is not a leaf with a file.
 */
function getLeafPath(node: LayoutNode): string | null {
	if (node['type'] !== 'leaf' || !isRecord(node['state'])) {
		return null;
	}

	const inner = node['state']['state'];
	return isRecord(inner) && typeof inner['file'] === 'string' ? inner['file'] : null;
}

/**
 * Reads a node's children.
 *
 * @param node - A layout node.
 * @returns The child nodes, empty when there are none.
 */
function getChildren(node: LayoutNode): LayoutNode[] {
	const { children } = node;
	return Array.isArray(children) ? children.filter(isRecord) : [];
}

/**
 * Reads a split's direction.
 *
 * @param node - A split node.
 * @returns The direction, `vertical` when the node has none.
 */
function getDirection(node: LayoutNode): 'horizontal' | 'vertical' {
	return node['direction'] === 'horizontal' ? 'horizontal' : 'vertical';
}

/**
 * Collects every member path in a plan, in order.
 *
 * @param plan - The plan.
 * @returns The paths.
 */
export function getPlanPaths(plan: RestorePlan): string[] {
	return plan.kind === 'tabs' ? plan.paths : plan.children.flatMap(getPlanPaths);
}

/**
 * Flattens a plan to one tab group per group of the original, in order, split in the original's root direction.
 *
 * @param plan - The plan.
 * @returns The flat plan.
 */
export function flattenPlan(plan: RestorePlan): RestorePlan {
	if (plan.kind === 'tabs') {
		return plan;
	}

	const groups: TabGroupPlan[] = [];
	const collect = (node: RestorePlan): void => {
		if (node.kind === 'tabs') {
			groups.push(node);
			return;
		}
		node.children.forEach(collect);
	};
	collect(plan);

	return groups.length === 1
		? groups[0]
		: { kind: 'split', direction: plan.direction, children: groups };
}

/**
 * Plans a restore: keeps only the paths in `placeable`, once each, drops every group left empty and collapses every split left with one child.
 *
 * @param snapshot - The stored layout snapshot.
 * @param placeable - Paths that may be placed.
 * @returns The plan, or null when nothing can be placed.
 */
export function planRestore(
	snapshot: LayoutNode,
	placeable: ReadonlySet<string>
): RestorePlan | null {
	const seen = new Set<string>();

	/**
	 * Plans one node.
	 *
	 * @param node - The node.
	 * @returns Its plan, or null when nothing in it can be placed.
	 */
	const plan = (node: LayoutNode): RestorePlan | null => {
		const leafPath = getLeafPath(node);
		if (leafPath !== null) {
			if (!placeable.has(leafPath) || seen.has(leafPath)) {
				return null;
			}
			seen.add(leafPath);
			return { kind: 'tabs', paths: [leafPath] };
		}

		if (node['type'] === 'tabs') {
			const paths: string[] = [];
			for (const child of getChildren(node)) {
				const path = getLeafPath(child);
				if (path !== null && placeable.has(path) && !seen.has(path)) {
					seen.add(path);
					paths.push(path);
				}
			}
			return paths.length === 0 ? null : { kind: 'tabs', paths };
		}

		const children = getChildren(node)
			.map(plan)
			.filter((child): child is RestorePlan => child !== null);
		if (children.length === 0) {
			return null;
		}
		return children.length === 1
			? children[0]
			: { kind: 'split', direction: getDirection(node), children };
	};

	return plan(snapshot);
}

/**
 * Prunes a captured layout to the open members: drops every other leaf, then every group or split left empty, collapses every split left with one child, and strips `id` and `currentTab`.
 *
 * @param node - A layout node, normally the `main` tree of `getLayout()`.
 * @param isOpenMember - Whether a file path is an open member.
 * @returns The pruned node, or null when no open member is in it.
 */
export function pruneLayout(
	node: unknown,
	isOpenMember: (path: string) => boolean
): LayoutNode | null {
	if (!isRecord(node)) {
		return null;
	}

	/**
	 * Copies a node without the fields that are not kept.
	 *
	 * @param source - The node.
	 * @returns The copy.
	 */
	const strip = (source: LayoutNode): LayoutNode => {
		const { id: _id, currentTab: _currentTab, children: _children, ...rest } = source;
		return rest;
	};

	if (node['type'] === 'leaf') {
		const path = getLeafPath(node);
		return path !== null && isOpenMember(path) ? strip(node) : null;
	}

	const children = getChildren(node)
		.map((child) => pruneLayout(child, isOpenMember))
		.filter((child): child is LayoutNode => child !== null);
	if (children.length === 0) {
		return null;
	}
	if (node['type'] === 'split' && children.length === 1) {
		return children[0];
	}
	return { ...strip(node), children };
}