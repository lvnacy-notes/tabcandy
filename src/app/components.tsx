/** @file React components for the new tab and the Cluster sidebar. */
import { TFile, getIcon } from 'obsidian';
import {
	CSSProperties,
	KeyboardEvent,
	ReactNode,
	RefObject,
	useEffect,
	useRef
} from 'react';
import {
	ClosedTabEntry,
	Quote,
	TabCandyCluster
} from '../types';

interface BackgroundSurfaceProps {
	background: string | null | undefined;
	transparent: boolean;
	transparentWithShadows: boolean;
	/** Text color override. Null or undefined keeps the CSS default. */
	overlayTextColor?: string | null;
	onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
	containerRef: RefObject<HTMLDivElement>;
	children: ReactNode;
}

interface BookmarksProps {
	files: TFile[];
	onOpen: (file: TFile) => void;
}

interface ClusterRowProps {
	cluster: TabCandyCluster;
	expanded: boolean;
	isFilePresent: (path: string) => boolean;
	onOpenMember: (path: string) => void;
	onRemoveMember: (path: string) => void;
	onToggle: () => void;
}

interface MemberRowProps {
	path: string;
	exists: boolean;
	onOpen: () => void;
	onRemove: () => void;
}

interface QuoteDisplayProps {
	quote: Quote | null;
	show: boolean;
}

interface RecentFilesProps {
	files: TFile[];
	onOpen: (file: TFile) => void;
}

interface RecentlyClosedTabsProps {
	entries: readonly ClosedTabEntry[];
	onOpen: (entry: ClosedTabEntry) => void;
}

interface SearchButtonProps {
	label: string;
	iconName: string;
	iconFirst?: boolean;
	className: string;
	textClassName: string;
	onClick: () => void;
}

/**
 * Full-bleed container. Applies the background image and text color, adds the transparent-theme classes when set, and forwards key presses.
 *
 * @param props.background - Background image URL, or none.
 * @param props.transparent - Whether to use the transparent theme class.
 * @param props.transparentWithShadows - Whether to use the transparent-with-shadows class.
 * @param props.overlayTextColor - Text color override.
 * @param props.onKeyDown - Called on key presses inside the container.
 * @param props.containerRef - Ref to the container element.
 * @param props.children - Content to render inside.
 */
export function BackgroundSurface({
	background,
	transparent,
	transparentWithShadows,
	overlayTextColor,
	onKeyDown,
	containerRef,
	children,
}: BackgroundSurfaceProps) {
	return (
		<div
			className = { `tabcandy-root ${
				transparent ? 'tabcandy-root--transparent' : ''
			} ${
				transparentWithShadows ? 'tabcandy-root--transparentWithShadows' : ''
			}`}
			style = {{
				...(background ? { backgroundImage: `url('${ background }')` } : undefined),
				...(overlayTextColor ? { color: overlayTextColor } : undefined),
			}}
			onKeyDown = { onKeyDown }
			tabIndex = { 0 }
			ref = { containerRef }
		>
			{ children }
		</div>
	);
}

/**
 * Lists files as buttons labeled with their names. Clicking one calls `onOpen` with its file.
 *
 * @param props.files - The files to list.
 * @param props.onOpen - Called with the clicked file.
 */
export function Bookmarks({ files, onOpen }: BookmarksProps) {
	return (
		<div className = 'tabcandy-dashboard-centeredrow'>
			{ files.map((file) => (
				<button
					type = 'button'
					key = { file.path }
					className = 'tabcandy-dashboard-fileicon'
					data-path = { file.path }
					onClick = { () => onOpen(file) }
				>
					<Icon name = 'bookmark' />
					<span className = 'tabcandy-dashboard-filelabel'>
						{ file.basename }
					</span>
				</button>
			))}
		</div>
	);
}

/**
 * A Cluster as a tab-header-styled row. Clicking it, or pressing Enter or Space on it, calls `onToggle`. While expanded it lists the members below. A Flavor is exposed as the CSS variable `--tabcandy-flavor`.
 *
 * @param props.cluster - The Cluster.
 * @param props.expanded - Whether the member list is shown.
 * @param props.isFilePresent - Whether a member's file exists.
 * @param props.onOpenMember - Called with the path of a clicked member.
 * @param props.onRemoveMember - Called with the path of a member whose minus button is clicked.
 * @param props.onToggle - Called when the row is activated.
 */
export function ClusterRow({
	cluster,
	expanded,
	isFilePresent,
	onOpenMember,
	onRemoveMember,
	onToggle,
}: ClusterRowProps) {
	return (
		<div className = 'tabcandy-cluster' >
			<div
				className = 'workspace-tab-header tabcandy-cluster-header'
				role = 'button'
				tabIndex = { 0 }
				aria-expanded = { expanded }
				style = { getFlavorStyle(cluster.flavor) }
				onClick = { onToggle }
				onKeyDown = { (event: KeyboardEvent<HTMLDivElement>) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						onToggle();
					}
				} }
			>
				<div className = 'workspace-tab-header-inner' >
					<div className = 'workspace-tab-header-inner-title' >{ cluster.name }</div>
					<span className = 'tabcandy-cluster-count' >{ cluster.members.length }</span>
				</div>
			</div>
			{ expanded && (
				<div className = 'tabcandy-cluster-drawer' >
					{ cluster.members.length === 0 && (
						<div className = 'tabcandy-empty' >No tabs yet.</div>
					) }
					{ cluster.members.map((path) => (
						<MemberRow
							key = { path }
							path = { path }
							exists = { isFilePresent(path) }
							onOpen = { () => onOpenMember(path) }
							onRemove = { () => onRemoveMember(path) }
						/>
					)) }
				</div>
			) }
		</div>
	);
}

/**
 * Exposes a Flavor to CSS.
 *
 * @param flavor - Hex color, or undefined for none.
 * @returns The inline style, or undefined when there is no Flavor.
 */
function getFlavorStyle(flavor: string | undefined): CSSProperties | undefined {
	return flavor === undefined ? undefined : ({ '--tabcandy-flavor': flavor } as CSSProperties);
}

/**
 * Names a member by its file name without the extension.
 *
 * @param path - Vault-relative file path.
 * @returns The label.
 */
function getMemberLabel(path: string): string {
	const name = path.slice(path.lastIndexOf('/') + 1);
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Renders the Obsidian icon `name` in an `aria-hidden` span. The span stays empty when the name is unknown.
 *
 * @param props.name - Obsidian icon id.
 */
export function Icon({ name }: { name: string }) {
	const spanRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) {return;}

		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}

		const icon = getIcon(name);
		if (icon) {
			el.appendChild(icon);
		}
	}, [name]);

	return (
		<span
			className = 'tabcandy-icon'
			ref = { spanRef }
			aria-hidden = 'true'
		/>
	);
}

/**
 * One member of a Cluster, styled as a tab header. A missing member is marked unresolved. Clicking the title calls `onOpen`; clicking the minus button calls `onRemove`.
 *
 * @param props.path - Vault-relative file path.
 * @param props.exists - Whether the file exists.
 * @param props.onOpen - Called when the title is clicked.
 * @param props.onRemove - Called when the minus button is clicked.
 */
export function MemberRow({
	path,
	exists,
	onOpen,
	onRemove,
}: MemberRowProps) {
	return (
		<div className = { exists ? 'workspace-tab-header tabcandy-member-row' : 'workspace-tab-header tabcandy-member-row is-unresolved' } >
			<div className = 'workspace-tab-header-inner' >
				<button
					className = 'workspace-tab-header-inner-title tabcandy-member-title'
					title = { exists ? path : `${ path } (file not found)` }
					onClick = { onOpen }
				>
					{ getMemberLabel(path) }
				</button>
				<button
					className = 'tabcandy-member-remove'
					aria-label = 'Remove from cluster'
					onClick = { onRemove }
				>
					−
				</button>
			</div>
		</div>
	);
}

/**
 * Renders a quote and its author when `show` is true and a quote is set.
 *
 * @param props.quote - The quote, or null.
 * @param props.show - Whether to render it.
 */
export function QuoteDisplay({ quote, show }: QuoteDisplayProps) {
	return (
		<div className = 'tabcandy-quote'>
			{ quote && show && (
				<>
					<div className = 'tabcandy-quote-content'>
						&quot;{ quote.content }&quot;
					</div>
					<div className = 'tabcandy-quote-author'>{ quote.author }</div>
				</>
			)}
		</div>
	);
}

/**
 * Lists files as buttons labeled with their names. Clicking one calls `onOpen` with its file.
 *
 * @param props.files - The files to list.
 * @param props.onOpen - Called with the clicked file.
 */
export function RecentFiles({ files, onOpen }: RecentFilesProps) {
	return (
		<div className = 'tabcandy-dashboard-centeredrow'>
			{ files.map((file) => (
				<button
					type = 'button'
					key = { file.path }
					className = 'tabcandy-dashboard-fileicon'
					data-path = { file.path }
					onClick = { () => onOpen(file) }
				>
					<Icon name = 'file' />
					<span className = 'tabcandy-dashboard-filelabel'>
						{ file.basename }
					</span>
				</button>
			))}
		</div>
	);
}

/**
 * Lists closed tabs as buttons, each titled with the tab's full title. Clicking one calls `onOpen` with its entry.
 *
 * @param props.entries - The closed tabs, in display order.
 * @param props.onOpen - Called with the clicked entry.
 */
export function RecentlyClosedTabs({ entries, onOpen }: RecentlyClosedTabsProps) {
	return (
		<div className = 'tabcandy-dashboard-centeredrow'>
			{ entries.map((entry, index) => (
				<button
					type = 'button'
					key = { `${index}:${entry.title}` }
					className = 'tabcandy-dashboard-fileicon'
					title = { entry.title }
					onClick = { () => onOpen(entry) }
				>
					<Icon name = 'history' />
					<span className = 'tabcandy-dashboard-filelabel'>
						{ entry.title }
					</span>
				</button>
			))}
		</div>
	);
}

/**
 * A button with an icon and a label, in either order. `label` is its accessible name. Clicking it calls `onClick`.
 *
 * @param props.label - Button label.
 * @param props.iconName - Obsidian icon id.
 * @param props.iconFirst - Whether the icon precedes the label.
 * @param props.className - Class for the button.
 * @param props.textClassName - Class for the label.
 * @param props.onClick - Called when the button is clicked.
 */
export function SearchButton({
	label,
	iconName,
	iconFirst,
	className,
	textClassName,
	onClick,
}: SearchButtonProps) {
	return (
		<button
			type = 'button'
			className = { className }
			aria-label = { label }
			onClick = { onClick }
		>
			{ iconFirst && <Icon name = { iconName } /> }
			<span className = { textClassName }>{ label }</span>
			{ !iconFirst && <Icon name = { iconName } />}
		</button>
	);
}