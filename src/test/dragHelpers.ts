/** @file Helpers for firing drag events in tests. */
import { App } from 'obsidian';


/**
 * Builds a data transfer that holds what is set on it, for events fired in jsdom.
 *
 * @returns The data transfer.
 */
export function buildDataTransfer(): DataTransfer {
	const data = new Map<string, string>();
	return {
		get types(): string[] {
			return [...data.keys()];
		},
		getData: (type: string): string => data.get(type) ?? '',
		setData: (type: string, value: string): void => {
			data.set(type, value);
		},
		dropEffect: 'none',
		effectAllowed: 'none',
	} as unknown as DataTransfer;
}

/**
 * Assigns what the fake app's `dragManager` holds. The fake app throws when an unassigned property is read, so a test that drags anything assigns this first.
 *
 * @param app - The fake app.
 * @param dragManager - The drag manager, or undefined for none.
 */
export function setDragManager(app: App, dragManager: object | undefined): void {
	(app as unknown as { dragManager: object | undefined }).dragManager = dragManager;
}