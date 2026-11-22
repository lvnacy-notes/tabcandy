/** @file React components for the new tab and the Cluster sidebar. */
import {
	Menu,
	TFile,
	getIcon
} from 'obsidian';
import {
	CSSProperties,
	DragEvent as ReactDragEvent,
	KeyboardEvent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
	RefObject,
	useEffect,
	useRef,
	useState
} from 'react';
import {
	ClosedTabEntry,
	ClusterMenuActions,
	Quote,
	TabCandyCluster
} from '../types';

const MEMBER_DRAG_TYPE = 'application/x-tabcandy-member';

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
	getDraggedPath: () => string | null;
	hasOpenMember: () => boolean;
	isFilePresent: (path: string) => boolean;
	onCloseCluster: () => void;
	onConfirmUnlink: () => void;
	onDragCluster: (target: Element | null) => void;
	onDragMember: (path: string, event: DragEvent) => void;
	onDropPath: (path: string) => void;
	onMoveMember: (fromIndex: number, toIndex: number) => void;
	onOpenCluster: () => void;
	onOpenMember: (path: string) => void;
	onOpenTray: () => void;
	onPair: () => void;
	onRemoveMember: (path: string) => void;
	onResolveMissing: (focusPath?: string) => void;
	onToggle: () => void;
	onUnlink: () => void;
	pairedName: string | null;
}

interface MemberListProps {
	cluster: TabCandyCluster;
	isFilePresent: (path: string) => boolean;
	onDragMember: (path: string, event: DragEvent) => void;
	onMoveMember: (fromIndex: number, toIndex: number) => void;
	onOpenMember: (path: string) => void;
	onRemoveMember: (path: string) => void;
	onResolveMissing: (focusPath?: string) => void;
}

interface MemberRowProps {
	clusterId: string;
	count: number;
	index: number;
	path: string;
	exists: boolean;
	onDragOut: (event: DragEvent) => void;
	onMove: (fromIndex: number, toIndex: number) => void;
	onOpen: () => void;
	onRemove: () => void;
	onResolve: () => void;
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

/******************************************************************************
 * Components
 *****************************************************************************/

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
export function Bookmarks({
	files, onOpen
}: BookmarksProps) {
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
 * A Cluster as a tab-header-styled row. Clicking it, or pressing Enter or Space on it, calls `onToggle`. Its options button and its context menu offer Open tray, Open cluster, Close cluster while a member is open, and Pair with… or Unlink. Its 🔗 icon pairs when unpaired and unlinks at once when paired. While expanded it lists the members below. A Flavor is exposed as the CSS variable `--tabcandy-flavor` and paints the header background through the `tabcandy-cluster-header--flavored` class.
 *
 * @param props.cluster - The Cluster.
 * @param props.expanded - Whether the member list is shown.
 * @param props.getDraggedPath - Reads the path of the file or tab being dragged, or null when there is none.
 * @param props.hasOpenMember - Whether a member is open right now. Read when the menu opens.
 * @param props.isFilePresent - Whether a member's file exists.
 * @param props.onCloseCluster - Called when Close cluster is chosen from the row's menu.
 * @param props.onConfirmUnlink - Called when Unlink is chosen from the row's menu.
 * @param props.onDragCluster - Called with the element under the pointer when a drag of the Cluster's row ends.
 * @param props.onDragMember - Called with a member's path and the drag start event when a member row starts to drag.
 * @param props.onDropPath - Called with the path of a file or tab dropped on the Cluster's row.
 * @param props.onMoveMember - Called with a member's current and new positions when it is reordered.
 * @param props.onOpenCluster - Called when Open cluster is chosen from the row's menu.
 * @param props.onOpenMember - Called with the path of a clicked member.
 * @param props.onOpenTray - Called when Open tray is chosen from the row's context menu.
 * @param props.onPair - Called when the 🔗 icon is clicked while unpaired, and when Pair with… is chosen from the row's menu.
 * @param props.onRemoveMember - Called with the path of a member whose minus button is clicked.
 * @param props.onResolveMissing - Called to resolve missing members, with the path of a single missing member to focus or none for all.
 * @param props.onToggle - Called when the row is activated.
 * @param props.onUnlink - Called when the 🔗 icon is clicked while paired.
 * @param props.pairedName - Name of the paired Cluster, or null when unpaired.
 */
export function ClusterRow({
	cluster,
	expanded,
	getDraggedPath,
	hasOpenMember,
	isFilePresent,
	onCloseCluster,
	onConfirmUnlink,
	onDragCluster,
	onDragMember,
	onDropPath,
	onMoveMember,
	onOpenCluster,
	onOpenMember,
	onOpenTray,
	onPair,
	onRemoveMember,
	onResolveMissing,
	onToggle,
	onUnlink,
	pairedName,
}: ClusterRowProps) {
	const [dragOver, setDragOver] = useState(false);
	const menuActions: ClusterMenuActions = {
		hasOpenMember,
		onCloseCluster,
		onConfirmUnlink,
		onOpenCluster,
		onOpenTray,
		onPair,
		pairedName,
	};

	const headerClasses = ['workspace-tab-header', 'tabcandy-cluster-header'];
	if (cluster.flavor !== undefined) {
		headerClasses.push('tabcandy-cluster-header--flavored');
	}
	if (dragOver) {
		headerClasses.push('is-drag-over');
	}

	return (
		<div className = 'tabcandy-cluster' >
			<div
				className = { headerClasses.join(' ') }
				role = 'button'
				tabIndex = { 0 }
				aria-expanded = { expanded }
				style = { getFlavorStyle(cluster.flavor) }
				onClick = { onToggle }
				draggable
				onContextMenu = { (event: ReactMouseEvent<HTMLDivElement>) => {
					event.preventDefault();
					openClusterMenu(event.nativeEvent, menuActions);
				} }
				onDragEnd = { (event: ReactDragEvent<HTMLDivElement>) => {
					onDragCluster(event.currentTarget.ownerDocument.elementFromPoint(event.clientX, event.clientY));
				} }
				onDragLeave = { () => setDragOver(false) }
				onDragOver = { (event: ReactDragEvent<HTMLDivElement>) => {
					if (getDraggedPath() !== null) {
						event.preventDefault();
						event.dataTransfer.dropEffect = 'copy';
						setDragOver(true);
					}
				} }
				onDragStart = { (event: ReactDragEvent<HTMLDivElement>) => {
					event.dataTransfer.setData('text/plain', cluster.name);
					event.dataTransfer.effectAllowed = 'copy';
				} }
				onDrop = { (event: ReactDragEvent<HTMLDivElement>) => {
					setDragOver(false);
					const path = getDraggedPath();
					if (path !== null) {
						event.preventDefault();
						onDropPath(path);
					}
				} }
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
					<button
						className = { pairedName === null ? 'tabcandy-pair-button' : 'tabcandy-pair-button is-paired' }
						aria-label = { pairedName === null ? 'Pair with another cluster' : `Unlink from ${ pairedName }` }
						onClick = { (event: ReactMouseEvent<HTMLButtonElement>) => {
							event.stopPropagation();
							if (pairedName === null) {
								onPair();
							} else {
								onUnlink();
							}
						} }
						onKeyDown = { (event: KeyboardEvent<HTMLButtonElement>) => {
							event.stopPropagation();
						} }
					>
						<Icon name = 'link' />
					</button>
					<button
						className = 'tabcandy-menu-button'
						aria-label = 'Cluster options'
						onClick = { (event: ReactMouseEvent<HTMLButtonElement>) => {
							event.stopPropagation();
							openClusterMenu(event.nativeEvent, menuActions);
						} }
						onKeyDown = { (event: KeyboardEvent<HTMLButtonElement>) => {
							event.stopPropagation();
						} }
					>
						⋯
					</button>
				</div>
			</div>
			{ expanded && (
				<div className = 'tabcandy-cluster-drawer' >
					<MemberList
						cluster = { cluster }
						isFilePresent = { isFilePresent }
						onDragMember = { onDragMember }
						onMoveMember = { onMoveMember }
						onOpenMember = { onOpenMember }
						onRemoveMember = { onRemoveMember }
						onResolveMissing = { onResolveMissing }
					/>
				</div>
			) }
		</div>
	);
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
 * A Cluster's members as rows. Shows a note when there are none, and a button that resolves missing members when any file is missing.
 *
 * @param props.cluster - The Cluster.
 * @param props.isFilePresent - Whether a member's file exists.
 * @param props.onDragMember - Called with a member's path and the drag start event when a row starts to drag.
 * @param props.onMoveMember - Called with a member's current and new positions when it is reordered.
 * @param props.onOpenMember - Called with the path of a clicked member.
 * @param props.onRemoveMember - Called with the path of a member whose minus button is clicked.
 * @param props.onResolveMissing - Called to resolve missing members, with the path of a single missing member to focus or none for all.
 */
export function MemberList({
	cluster,
	isFilePresent,
	onDragMember,
	onMoveMember,
	onOpenMember,
	onRemoveMember,
	onResolveMissing,
}: MemberListProps) {
	const missingCount = cluster.members.filter((path) => !isFilePresent(path)).length;

	return (
		<div className = 'tabcandy-member-list' >
			{ cluster.members.length === 0 && (
				<div className = 'tabcandy-empty' >No tabs yet.</div>
			) }
			{ missingCount > 0 && (
				<button
					className = 'tabcandy-resolve-missing'
					onClick = { () => onResolveMissing() }
				>
					{ `Resolve missing (${ missingCount })` }
				</button>
			) }
			{ cluster.members.map((path, index) => (
				<MemberRow
					key = { path }
					clusterId = { cluster.id }
					count = { cluster.members.length }
					index = { index }
					path = { path }
					exists = { isFilePresent(path) }
					onDragOut = { (event) => onDragMember(path, event) }
					onMove = { onMoveMember }
					onOpen = { () => onOpenMember(path) }
					onRemove = { () => onRemoveMember(path) }
					onResolve = { () => onResolveMissing(path) }
				/>
			)) }
		</div>
	);
}

/**
 * One member of a Cluster, styled as a tab header. A missing member is marked unresolved. Clicking the title calls `onOpen`; clicking the minus button calls `onRemove`. The row can be dragged onto another member of the same Cluster to reorder, or onto a pane to open it. Its options button and its context menu offer Move up and Move down, plus Resolve missing member when the file is missing. The options button is left out when the menu would be empty.
 *
 * @param props.clusterId - Id of the Cluster the row belongs to.
 * @param props.count - Number of members in the Cluster.
 * @param props.index - Position of the member in the Cluster.
 * @param props.path - Vault-relative file path.
 * @param props.exists - Whether the file exists.
 * @param props.onDragOut - Called with the drag start event, so the row can also be dropped on a pane to open it.
 * @param props.onMove - Called with the member's current and new positions.
 * @param props.onOpen - Called when the title is clicked.
 * @param props.onRemove - Called when the minus button is clicked.
 * @param props.onResolve - Called when Resolve missing member is chosen from the context menu.
 */
export function MemberRow({
	clusterId,
	count,
	index,
	path,
	exists,
	onDragOut,
	onMove,
	onOpen,
	onRemove,
	onResolve,
}: MemberRowProps) {
	const [dragOver, setDragOver] = useState(false);
	const hasMenu = count > 1 || !exists;

	const classes = ['workspace-tab-header', 'tabcandy-member-row'];
	if (!exists) {
		classes.push('is-unresolved');
	}
	if (dragOver) {
		classes.push('is-drag-over');
	}

	return (
		<div
			className = { classes.join(' ') }
			draggable = { true }
			onContextMenu = { (event: ReactMouseEvent<HTMLDivElement>) => {
				event.preventDefault();
				openMemberMenu(
					event.nativeEvent,
					index,
					count,
					exists,
					onMove,
					onResolve
				);
			} }
			onDragEnd = { () => setDragOver(false) }
			onDragLeave = { () => setDragOver(false) }
			onDragOver = { (event: ReactDragEvent<HTMLDivElement>) => {
				if (event.dataTransfer.types.includes(MEMBER_DRAG_TYPE)) {
					event.preventDefault();
					event.dataTransfer.dropEffect = 'move';
					setDragOver(true);
				}
			} }
			onDragStart = { (event: ReactDragEvent<HTMLDivElement>) => {
				event.dataTransfer.effectAllowed = 'move';
				event.dataTransfer.setData(MEMBER_DRAG_TYPE, JSON.stringify({ clusterId, index }));
				onDragOut(event.nativeEvent);
			} }
			onDrop = { (event: ReactDragEvent<HTMLDivElement>) => {
				setDragOver(false);
				const dragged = parseMemberDrag(event.dataTransfer.getData(MEMBER_DRAG_TYPE));
				if (dragged?.clusterId === clusterId) {
					event.preventDefault();
					onMove(dragged.index, index);
				}
			} }
		>
			<div className = 'workspace-tab-header-inner' >
				<button
					className = 'workspace-tab-header-inner-title tabcandy-member-title'
					title = { exists ? path : `${ path } (file not found)` }
					onClick = { onOpen }
				>
					{ getMemberLabel(path) }
				</button>
				{ hasMenu && (
					<button
						className = 'tabcandy-menu-button'
						aria-label = 'Member options'
						onClick = { (event: ReactMouseEvent<HTMLButtonElement>) => {
							openMemberMenu(
								event.nativeEvent,
								index,
								count,
								exists,
								onMove,
								onResolve
							);
						} }
					>
						⋯
					</button>
				) }
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

/******************************************************************************
 * Helper functions
 *****************************************************************************/

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
 * Opens a Cluster's options menu: Open tray (the row only), Open cluster, Close cluster while a member is open, and Pair with… or Unlink.
 *
 * @param event - The event that opened the menu.
 * @param actions - What the menu offers.
 */
export function openClusterMenu(event: MouseEvent, actions: ClusterMenuActions): void {
	const menu = new Menu();
	if (actions.onOpenTray !== undefined) {
		const { onOpenTray } = actions;
		menu.addItem((item) => {
			item.setTitle('Open tray').setIcon('layers').onClick(onOpenTray);
		});
	}
	menu.addItem((item) => {
		item.setTitle('Open cluster').setIcon('folder-open').onClick(actions.onOpenCluster);
	});
	if (actions.hasOpenMember()) {
		menu.addItem((item) => {
			item.setTitle('Close cluster').setIcon('folder-closed').onClick(actions.onCloseCluster);
		});
	}
	menu.addItem((item) => {
		if (actions.pairedName === null) {
			item.setTitle('Pair with…').setIcon('link').onClick(actions.onPair);
		} else {
			item.setTitle('Unlink').setIcon('unlink').onClick(actions.onConfirmUnlink);
		}
	});
	menu.showAtMouseEvent(event);
}

/**
 * Opens a member row's context menu: Move up and Move down, each left out where the member can't move that way, and Resolve missing member when the file is missing.
 *
 * @param event - The context menu event.
 * @param index - Position of the member.
 * @param count - Number of members in the Cluster.
 * @param exists - Whether the member's file exists.
 * @param onMove - Called with the member's current and new positions.
 * @param onResolve - Called when Resolve missing member is chosen.
 */
function openMemberMenu(
	event: MouseEvent,
	index: number,
	count: number,
	exists: boolean,
	onMove: (fromIndex: number, toIndex: number) => void,
	onResolve: () => void
): void {
	const menu = new Menu();
	if (index > 0) {
		menu.addItem((item) => {
			item.setTitle('Move up').setIcon('arrow-up').onClick(() => onMove(index, index - 1));
		});
	}
	if (index < count - 1) {
		menu.addItem((item) => {
			item.setTitle('Move down').setIcon('arrow-down').onClick(() => onMove(index, index + 1));
		});
	}
	if (!exists) {
		menu.addItem((item) => {
			item.setTitle('Resolve missing member').setIcon('search').onClick(onResolve);
		});
	}
	menu.showAtMouseEvent(event);
}

/**
 * Reads the payload a member row sets when a drag starts.
 *
 * @param raw - The payload text.
 * @returns The Cluster id and position, or null when the payload isn't one.
 */
function parseMemberDrag(raw: string): { clusterId: string; index: number } | null {
	try {
		const value: unknown = JSON.parse(raw);
		if (
			typeof value === 'object'
			&& value !== null
			&& 'clusterId' in value
			&& 'index' in value
			&& typeof value.clusterId === 'string'
			&& typeof value.index === 'number'
		) {
			return { clusterId: value.clusterId, index: value.index };
		}
	} catch {
		return null;
	}
	return null;
}